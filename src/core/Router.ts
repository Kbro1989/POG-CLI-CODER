/**
 * Free Model Router with Strategy Pattern (Google Golden Standard)
 * 
 * Composition:
 * - OverrideStrategy: Direct mapping for high-certainty intents
 * - ComplexityStrategy: Neural ternary decision tree
 * - FallbackStrategy: Resilient circuit-breaker mapping
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import pino from 'pino';
import { execSync } from 'child_process';
import { ModelInventory } from './ModelInventory.js';
import type {
  ModelPerformance,
  CircuitBreakerState,
  Result,
  FreeModelConfig,
  TernaryNode,
  RawRoutingContext,
  AssessedRoutingContext,
  Ternary,
  RoutingDecision,
  CircuitState,
  VibeConfig
} from './models.js';
import { CircuitState as CS, TaskType as TT, ModelType as MT } from './models.js';
import { ContextBuilder } from '../context/ContextBuilder.js';
import { VectorDB } from '../learning/VectorDB.js';
import { GeminiService } from './GeminiService.js';
import { TaskClassifier } from './TaskClassifier.js';

const logger = pino({
  name: 'Router',
  base: { hostname: 'POG-VIBE' }
});

// Phase 18: Google Standard Routing Abstractions
export interface RoutingContext extends AssessedRoutingContext {
  availableModels: ReadonlyArray<FreeModelConfig>;
}

export interface IRoutingStrategy {
  decide(ctx: RoutingContext): RoutingDecision | null;
}

/**
 * Strategy 1: Override Strategy
 * Handles diagnostic/status/simple tasks with high certainty
 */
class OverrideStrategy implements IRoutingStrategy {
  decide(ctx: RoutingContext): RoutingDecision | null {
    const prompt = ctx.prompt.toLowerCase();

    // Simple diagnostic overrides
    if (prompt.length < 25 && /\b(health|status|audit|check|verify|ping)\b/.test(prompt)) {
      return {
        modelName: 'gemini-flash',
        path: [-1],
        reason: 'Override: Rapid health/status check',
        candidateConfidence: 1.0,
        regretLikelihood: 0.01
      };
    }

    // High-Stakes Cloud/DevOps overrides
    if (/\b(wrangler|gcloud|deploy|production|critical|security|auth|secrets|env)\b/.test(prompt)) {
      return {
        modelName: 'gemini-3-pro-preview',
        path: [1],
        reason: 'Override: High-stakes DevOps/Security target',
        candidateConfidence: 0.95,
        regretLikelihood: 0.02
      };
    }

    // Complex Research/Architecture overrides
    if (ctx.weightedTasks[TT.Architecture] > 0.8 || ctx.weightedTasks[TT.APIOrchestration] > 0.8) {
      return {
        modelName: 'gemini-thinking',
        path: [1],
        reason: 'Override: Extreme abstract complexity',
        candidateConfidence: 0.9,
        regretLikelihood: 0.05
      };
    }

    return null;
  }
}

/**
 * Strategy 2: Complexity Strategy (The core Decision Tree)
 */
class ComplexityStrategy implements IRoutingStrategy {
  constructor(private router: FreeModelRouter, private tree: TernaryNode) { }

  decide(ctx: RoutingContext): RoutingDecision | null {
    return this.router.traverseTree(this.tree, ctx);
  }
}

/**
 * Strategy 3: Fallback Strategy (Resilience Layer)
 */
class FallbackStrategy implements IRoutingStrategy {
  constructor() { }

  decide(_ctx: RoutingContext): RoutingDecision | null {
    // This is always terminal if reached as a last resort
    return null; // The composite will handle the fallback
  }
}

/**
 * Strategy 4: Semantic Strategy (Massive Model Inventory)
 */
class SemanticStrategy implements IRoutingStrategy {
  constructor(_router: FreeModelRouter, _db: VectorDB) { }

  decide(ctx: RoutingContext): RoutingDecision | null {
    // Only trigger for complex/esoteric tasks where the static tree might fail
    if (ctx.complexity < 1 && ctx.weightedTasks[TT.Esoteric] < 0.5) return null;

    // This requires async in a real implementation.
    // For now, we assume this strategy is a placeholder for the V2 Semantic Router
    return null;
  }
}

export class FreeModelRouter {
  private readonly performanceDB: string;
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private readonly strategies: IRoutingStrategy[] = [];
  private healthCache: ReadonlyArray<FreeModelConfig> | null = null;
  private lastHealthCheck = 0;
  private readonly HEALTH_TTL = 30000;

  // Model Inventory - Optimized by Speed & Job Type
  private readonly FREE_MODELS: ReadonlyArray<FreeModelConfig> = [
    {
      name: 'gemini-3-flash-preview',
      command: 'gemini:gemini-3-flash-preview',
      type: MT.CloudFree,
      capabilities: ['agentic', 'coding', 'multimodal', 'generate', 'refactor', 'test'],
      fallback: 'gemini-2.5-flash-preview',
      maxTokens: 32768,
      priority: 100
    },
    {
      name: 'gemini-3-pro-preview',
      command: 'gemini:gemini-3-pro-preview',
      type: MT.CloudFree,
      capabilities: ['architecture', 'extreme-reasoning', 'planning', 'agentic', 'coding'],
      fallback: 'gemini-2.5-pro',
      maxTokens: 32768,
      priority: 99
    },
    {
      name: 'gemini-2.5-flash-preview',
      command: 'gemini:gemini-2.5-flash-preview',
      type: MT.CloudFree,
      capabilities: ['syntax', 'refactor', 'generate', 'low-latency'],
      fallback: 'gemini-2.5-flash',
      maxTokens: 32768,
      priority: 98
    },
    {
      name: 'gemini-2.5-pro',
      command: 'gemini:gemini-2.5-pro',
      type: MT.CloudFree,
      capabilities: ['architecture', 'complex-prompts', 'code'],
      fallback: 'gemini-2.0-flash',
      maxTokens: 32768,
      priority: 97
    },
    {
      name: 'gemini-flash',
      command: 'gemini:gemini-2.0-flash',
      type: MT.CloudFree,
      capabilities: ['syntax', 'refactor', 'generate', 'test', 'docs'],
      fallback: 'gemini-1.5-flash',
      maxTokens: 32768,
      priority: 90
    },
    {
      name: 'gemini-thinking',
      command: 'gemini:gemini-2.0-flash',
      type: MT.CloudFree,
      capabilities: ['architecture', 'extreme-reasoning', 'planning', 'orchestration'],
      fallback: 'gemini-1.5-pro',
      maxTokens: 32768,
      priority: 95
    },
    {
      name: 'gemini-1.5-flash',
      command: 'gemini:gemini-1.5-flash',
      type: MT.CloudFree,
      capabilities: ['quick-edit', 'web-dev', 'fallback'],
      fallback: 'qwen2.5-coder:7b-instruct-q4_K_M',
      maxTokens: 1000000,
      priority: 50
    },
    {
      name: 'gemini-1.5-pro',
      command: 'gemini:gemini-1.5-pro',
      type: MT.CloudFree,
      capabilities: ['architecture', 'planning', 'fallback'],
      fallback: 'qwen2.5-coder:14b-instruct-q5_K_M',
      maxTokens: 2000000,
      priority: 45
    },
    {
      name: 'qwen2.5-coder:7b-instruct-q4_K_M',
      command: 'ollama run qwen2.5-coder:7b-instruct-q4_K_M',
      type: MT.Local,
      capabilities: ['code', 'syntax', 'quick-fix', 'offline'],
      fallback: 'gemini-flash',
      maxTokens: 4096,
      priority: 75
    },
    {
      name: 'yi-coder:9b-chat-q5_K_M',
      command: 'ollama run yi-coder:9b-chat-q5_K_M',
      type: MT.Local,
      capabilities: ['code', 'web-dev', 'refactor', 'chat'],
      fallback: 'gemini-flash',
      maxTokens: 8192,
      priority: 70
    },
    {
      name: 'qwen2.5-coder:14b-instruct-q5_K_M',
      command: 'ollama run qwen2.5-coder:14b-instruct-q5_K_M',
      type: MT.Local,
      capabilities: ['code', 'architecture', 'complex-reasoning', 'orchestration'],
      fallback: 'gemini-thinking',
      maxTokens: 16384,
      priority: 60
    },
    {
      name: 'diagnostic-critic',
      command: `ollama run qwen2.5-coder:14b-instruct-q5_K_M`,
      type: MT.Local,
      capabilities: ['diagnostic', 'error-tracking', 'path-correction'],
      fallback: 'gemini-flash',
      priority: 100
    }
  ] as const;

  private readonly decisionTree: TernaryNode;
  contextBuilder: ContextBuilder;
  private dynamicModels: FreeModelConfig[] = [];

  constructor(private readonly config: VibeConfig, _gemini?: GeminiService) {
    this.performanceDB = join(this.config.pogDir, 'free-model-performance.json');
    this.initializeDB();
    this.loadPerformanceHistory();

    const vectorDB = new VectorDB(config);
    this.contextBuilder = new ContextBuilder(vectorDB, config.projectRoot, _gemini);

    // Phase 19: Massive Model Integration
    this.dynamicModels = ModelInventory.getAvailableModels();
    vectorDB.indexModelRegistry(ModelInventory.getRegistry()).catch(err => logger.error({ err }, 'Failed to index models'));

    this.decisionTree = this.buildDecisionTree();

    this.strategies = [
      new OverrideStrategy(),
      new ComplexityStrategy(this, this.decisionTree),
      new SemanticStrategy(this, vectorDB),
      new FallbackStrategy()
    ];

    logger.info({ pogDir: config.pogDir, modelCount: this.getAllModels().length }, 'Router Strategy Chain established');
  }

  // Helper to merge static and dynamic models
  private getAllModels(): ReadonlyArray<FreeModelConfig> {
    return [...this.FREE_MODELS, ...this.dynamicModels];
  }

  private initializeDB(): void {
    if (!existsSync(this.performanceDB)) {
      writeFileSync(this.performanceDB, JSON.stringify({ history: [], version: '1.2.0' }, null, 2));
    }
  }

  private buildDecisionTree(): TernaryNode {
    const leaf = (modelName: string): TernaryNode => ({ kind: 'leaf', modelName });

    return {
      kind: 'branch',
      description: 'Assess initial complexity state',
      condition: (ctx) => ctx.complexity,

      left: {
        kind: 'branch',
        description: 'Optimize for syntax probability',
        condition: (ctx) => ctx.weightedTasks[TT.Syntax] > 0.6 ? -1 : 0,
        left: leaf('gemini-flash'),
        center: leaf('qwen2.5-coder:7b-instruct-q4_K_M'),
        right: leaf('gemini-flash')
      },

      center: {
        kind: 'branch',
        description: 'Balanced performance vs circuit health signals',
        condition: (ctx) => this.checkCircuitHealth(ctx),
        left: leaf('yi-coder:9b-chat-q5_K_M'),
        center: leaf('gemini-flash'),
        right: leaf('gemini-flash')
      },

      right: {
        kind: 'branch',
        description: 'Architecture and Direct Implementation',
        condition: (ctx) => (ctx.weightedTasks[TT.Architecture] > 0.4 || ctx.weightedTasks[TT.Generate] > 0.4) ? 1 : 0,
        left: leaf('qwen2.5-coder:14b-instruct-q5_K_M'),
        center: leaf('gemini-thinking'),
        right: leaf('gemini-3-flash-preview')
      }
    };
  }

  route(prompt: string, filePath?: string): Result<string> {
    try {
      const weightedTasks = TaskClassifier.analyzeProbabilities(prompt);
      const availableModels = this.getModelHealthGrid();

      if (availableModels.filter(m => m.health?.isAvailable).length === 0) {
        return { ok: false, error: new Error('No functional models found. Check Ollama status and API keys.') };
      }

      const rawContext: RawRoutingContext = {
        prompt,
        weightedTasks,
        extension: filePath?.split('.').pop() ?? '',
        fileSize: filePath ? this.getFileSize(filePath) : undefined,
        historicalPerformance: this.loadPerformanceHistory(),
        availableModels
      };

      const context: RoutingContext = {
        ...rawContext,
        complexity: TaskClassifier.assessComplexity(prompt, weightedTasks),
        availableModels
      };

      // Traverse Strategy Chain
      let decision: RoutingDecision | null = null;
      for (const strategy of this.strategies) {
        decision = strategy.decide(context);
        if (decision) break;
      }

      const modelName = decision?.modelName || 'gemini-flash';

      // Binary Collapse: Apply Circuit Breaker
      const finalModel = this.applyCircuitBreaker(modelName, availableModels);

      logger.info({
        decision: modelName,
        strategy: decision?.reason || 'default',
        complexity: context.complexity
      }, 'Decision Engine Chain Resolution');

      return { ok: true, value: finalModel };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  // Removed local analyzeTaskProbabilities to use TaskClassifier

  public traverseTree(
    node: TernaryNode,
    context: AssessedRoutingContext,
    path: Ternary[] = [],
    reasons: string[] = []
  ): RoutingDecision {
    if (node.kind === 'leaf') {
      const confidence = 1.0 - (path.filter(p => p === 0).length * 0.2);
      const regret = context.complexity > 0 && node.modelName.includes('7b') ? 0.8 : 0.1;

      return {
        modelName: node.modelName,
        path: path,
        reason: reasons.length > 0 ? reasons.join(' -> ') : `Defaulted to leaf: ${node.modelName}`,
        candidateConfidence: confidence,
        regretLikelihood: regret
      };
    }

    const decision = node.condition(context);
    const nextNode = decision < 0 ? node.left : decision === 0 ? node.center : node.right;
    const currentReason = node.description ? `${node.description} [${decision}]` : `Branch [${decision}]`;

    return this.traverseTree(nextNode, context, [...path, decision], [...reasons, currentReason]);
  }

  // Removed local assessComplexity to use TaskClassifier

  private checkCircuitHealth(ctx: AssessedRoutingContext): Ternary {
    const healthScores = ctx.availableModels.map(m => m.health?.circuitLevel ?? 1);
    const averageHealth = healthScores.reduce<number>((a, b) => a + b, 0) / healthScores.length;

    if (averageHealth > 0.6) return 1;
    if (averageHealth > -0.2) return 0;
    return -1;
  }

  private getModelHealthGrid(): ReadonlyArray<FreeModelConfig> {
    if (this.healthCache && (Date.now() - this.lastHealthCheck < this.HEALTH_TTL)) {
      return this.healthCache;
    }

    try {
      let output = '';
      try {
        // Fast check only: don't wait for models to load
        output = execSync('ollama list', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      } catch { }

      const grid = this.getAllModels().map(m => {
        const isPresent = m.type === MT.CloudFree
          ? !!process.env['GOOGLE_API_KEY']
          : output.includes(m.name);

        const state = this.circuitBreakers.get(m.name);
        let circuitLevel: Ternary = 1;
        if (state?.state === CS.Open) circuitLevel = -1;
        else if (state?.state === CS.HalfOpen || (state?.failures ?? 0) > 0) circuitLevel = 0;

        return {
          ...m,
          health: {
            isAvailable: isPresent,
            circuitLevel,
            lastLatency: undefined
          }
        };
      });

      this.healthCache = grid;
      this.lastHealthCheck = Date.now();
      return grid;
    } catch {
      return this.FREE_MODELS.map(m => ({ ...m, health: { isAvailable: false, circuitLevel: -1 } }));
    }
  }

  private applyCircuitBreaker(model: string, available: ReadonlyArray<FreeModelConfig>): string {
    const state = this.circuitBreakers.get(model);
    if (state?.state === CS.Open) {
      if (Date.now() - state.lastFailure > state.cooldownMs) {
        state.state = CS.HalfOpen;
        this.circuitBreakers.set(model, state);
        return model;
      }
      const fallback = this.getAllModels().find(m => m.name === model)?.fallback ?? 'qwen2.5-coder:14b-instruct-q5_K_M';
      return available.some(m => m.name === fallback) ? fallback : (available[0]?.name ?? model);
    }
    return model;
  }

  private getFileSize(path: string): number {
    try { return readFileSync(path).length; } catch { return 0; }
  }

  private loadPerformanceHistory(): ReadonlyArray<ModelPerformance> {
    try { return JSON.parse(readFileSync(this.performanceDB, 'utf-8')).history; } catch { return []; }
  }

  recordPerformance(perf: ModelPerformance): void {
    try {
      const data = JSON.parse(readFileSync(this.performanceDB, 'utf-8'));
      data.history.push(perf);
      if (data.history.length > 1000) data.history.shift();
      writeFileSync(this.performanceDB, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error({ error }, 'Failed to record performance data');
    }
  }

  recordFailure(model: string): void {
    const state = this.circuitBreakers.get(model) || { model, failures: 0, threshold: this.config.circuitBreakerThreshold, state: CS.Closed, lastFailure: 0, cooldownMs: this.config.circuitBreakerCooldown };
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= state.threshold) state.state = CS.Open;
    this.circuitBreakers.set(model, state);
  }

  recordSuccess(model: string): void {
    const state = this.circuitBreakers.get(model);
    if (state) { state.failures = 0; state.state = CS.Closed; }
  }

  getCircuitState(model: string): CircuitState { return this.circuitBreakers.get(model)?.state ?? CS.Closed; }
}