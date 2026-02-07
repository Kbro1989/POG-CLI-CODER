/**
 * Free Model Router with Strategy Pattern (Google Golden Standard)
 * 
 * Composition:
 * - OverrideStrategy: Direct mapping for high-certainty intents
 * - ComplexityStrategy: Neural ternary decision tree
 * - FallbackStrategy: Resilient circuit-breaker mapping
 * - SemanticStrategy: Massively scalable dynamic model inventory
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
import { CircuitState as CS, TaskType as TT, ModelType as MT, ModelAbility as MA } from './models.js';
import { ContextBuilder } from '../context/ContextBuilder.js';
import { VectorDB } from '../learning/VectorDB.js';
import { GeminiService } from './GeminiService.js';
import { TaskClassifier } from './TaskClassifier.js';
import { ArchitectureDigest } from './ArchitectureDigest.js';

const logger = pino({
  name: 'Router',
  base: { hostname: 'POG-VIBE' }
});

export interface RoutingContext extends AssessedRoutingContext {
  availableModels: ReadonlyArray<FreeModelConfig>;
}

export interface IRoutingStrategy {
  decide(ctx: RoutingContext): RoutingDecision | null;
}

/**
 * Strategy 1: Override Strategy
 */
class OverrideStrategy implements IRoutingStrategy {
  decide(ctx: RoutingContext): RoutingDecision | null {
    const prompt = ctx.prompt.toLowerCase();

    if (prompt.length < 25 && /\b(health|status|audit|check|verify|ping)\b/.test(prompt)) {
      return {
        modelName: 'gemini-flash',
        path: [-1],
        reason: 'Override: Rapid health/status check',
        candidateConfidence: 1.0,
        regretLikelihood: 0.01,
        philosophy: {
          couldBe: 'gemini-3-pro-preview',
          shouldBe: 'gemini-flash',
          shouldNotBe: ['ollama-local']
        }
      };
    }

    if (/\b(wrangler|gcloud|deploy|production|critical|security|auth|secrets|env)\b/.test(prompt)) {
      return {
        modelName: 'gemini-3-pro-preview',
        path: [1],
        reason: 'Override: High-stakes DevOps/Security target',
        candidateConfidence: 0.95,
        regretLikelihood: 0.02,
        philosophy: {
          couldBe: 'gemini-thinking',
          shouldBe: 'gemini-3-pro-preview',
          shouldNotBe: ['low-tier-local']
        }
      };
    }

    if (ctx.weightedTasks[TT.Architecture] > 0.8 || ctx.weightedTasks[TT.APIOrchestration] > 0.8) {
      return {
        modelName: 'gemini-thinking',
        path: [1],
        reason: 'Override: Extreme abstract complexity',
        candidateConfidence: 0.9,
        regretLikelihood: 0.05,
        philosophy: {
          couldBe: 'gemini-thinking',
          shouldBe: 'gemini-thinking',
          shouldNotBe: ['non-thinking-models']
        }
      };
    }

    return null;
  }
}

/**
 * Strategy 2: Complexity Strategy
 */
class ComplexityStrategy implements IRoutingStrategy {
  constructor(private router: FreeModelRouter, private tree: TernaryNode) { }

  decide(ctx: RoutingContext): RoutingDecision | null {
    return this.router.traverseTree(this.tree, ctx);
  }
}

/**
 * Strategy 3: Fallback Strategy
 */
class FallbackStrategy implements IRoutingStrategy {
  decide(_ctx: RoutingContext): RoutingDecision | null {
    return null;
  }
}

/**
 * Strategy 4: Semantic Strategy
 */
class SemanticStrategy implements IRoutingStrategy {
  constructor(_router: FreeModelRouter, _db: VectorDB) { }

  decide(ctx: RoutingContext): RoutingDecision | null {
    // Only use semantic search for high complexity or specialized tasks
    if (ctx.complexity < 1 && ctx.weightedTasks[TT.Esoteric] < 0.5) return null;

    // This is a placeholder for V2 implementation where we'd do a vector search
    // for models that match the prompt's intent. For now, we return null to 
    // fall back to the Complexity Strategy which is our Gamma-standard workhorse.
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

  private readonly decisionTree: TernaryNode;
  public contextBuilder: ContextBuilder;
  private readonly dynamicModels: FreeModelConfig[];
  private readonly gemini: GeminiService | undefined;

  constructor(private readonly config: VibeConfig, _gemini?: GeminiService) {
    this.gemini = _gemini;
    this.performanceDB = join(this.config.pogDir, 'free-model-performance.json');
    this.initializeDB();

    const vectorDB = new VectorDB(config);
    this.contextBuilder = new ContextBuilder(vectorDB, config.projectRoot, config.projectId, _gemini);

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

  private getAllModels(): ReadonlyArray<FreeModelConfig> {
    return this.dynamicModels;
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
        description: 'Optimize for speed/syntax (Local Preferred)',
        condition: (ctx) => ctx.weightedTasks[TT.Syntax] > 0.7 ? -1 : 0,
        left: leaf('qwen2.5-coder:7b-instruct-q4_K_M'),
        center: leaf('yi-coder:9b-chat-q5_K_M'),
        right: leaf('gemini-2.0-flash') // Flash 2.0 is the new stable workhorse
      },

      center: {
        kind: 'branch',
        description: 'Moderate Complexity (Cloudflare Intermediate Tier)',
        condition: (ctx) => this.checkCircuitHealth(ctx),
        left: leaf('yi-coder:9b-chat-q5_K_M'),
        center: leaf('@cf/meta/llama-3.1-8b-instruct-fp8'), // Cloudflare edge tier
        right: leaf('gemini-2.0-flash')
      },

      right: {
        kind: 'branch',
        description: 'High Complexity / Architecture (Pro Tier)',
        condition: (ctx) => (ctx.weightedTasks[TT.Architecture] > 0.4 || ctx.weightedTasks[TT.Generate] > 0.4) ? 1 : 0,
        left: leaf('@cf/meta/llama-3.1-8b-instruct-fp8'),
        center: leaf('gemini-3-pro-preview'),
        right: leaf('gemini-3-pro-preview')
      }
    };
  }

  async route(prompt: string, filePath?: string): Promise<Result<string>> {
    try {
      const weightedTasks = TaskClassifier.analyzeProbabilities(prompt);
      const availableModels = this.getModelHealthGrid();

      if (availableModels.filter(m => m.health?.isAvailable).length === 0) {
        return { ok: false, error: new Error('No functional models found. Check Ollama status and API keys.') };
      }

      const staticComplexity = TaskClassifier.assessComplexity(prompt, weightedTasks);
      const complexity = (staticComplexity === 0 && this.gemini)
        ? await TaskClassifier.assessComplexityAI(prompt, this.gemini)
        : staticComplexity;

      // 3x3x3 Ternary Pipeline: Phase 1 - Sovereign SENSE
      const lessons = await this.contextBuilder.queryLessons(prompt);
      const regretBias = this.calculateRegretBias(lessons);

      // Cluster Intelligence Helpers (Sensing)
      const architectureDigest = new ArchitectureDigest(this.config.projectRoot);
      const architectureAlignment = this.contextBuilder.getArchitectureAlignment(prompt, architectureDigest.getManifest());
      const goldenTemplates = await this.contextBuilder.getGoldenTemplates(prompt);

      const rawContext: RawRoutingContext = {
        prompt,
        weightedTasks,
        extension: filePath?.split('.').pop() ?? '',
        fileSize: filePath ? this.getFileSize(filePath) : undefined,
        historicalPerformance: this.loadPerformanceHistory(),
        availableModels,
        architectureAlignment,
        goldenTemplates
      };

      // Cluster Intelligence Helpers (Thinking)
      const resourceRisk = this.runResourceFutureCheck(availableModels);
      const preMortemBias = this.runAdversarialPreMortem(prompt, weightedTasks);

      const context: RoutingContext = {
        ...rawContext,
        complexity,
        availableModels
      };

      // Phase 2 - Parallel THINK (Simulations biased by lessons + Cluster Helpers)
      const simulationBias = (regretBias + resourceRisk + preMortemBias) as Ternary;
      const simulations = await this.performSimulations(context, simulationBias);

      let decision: RoutingDecision | null = null;
      for (const strategy of this.strategies) {
        decision = strategy.decide(context);
        if (decision) break;
      }

      // Phase 3 - Synthesis (The optimal "Should Be")
      const modelName = this.synthesizeDecision(decision, simulations);
      const finalModel = this.applyCircuitBreaker(modelName, availableModels, complexity);

      logger.info({
        decision: modelName,
        simulations: simulations.map(s => s.modelName),
        regretBias,
        strategy: decision?.reason || 'default',
        complexity: complexity,
        finalSelected: finalModel
      }, 'Sovereign Routing Synthesis complete');

      return { ok: true, value: finalModel };
    } catch (err) {
      logger.error({ err }, 'Routing failed');
      return { ok: false, error: err as Error };
    }
  }

  /**
   * Performs 3 parallel "thought processes" (Simulations)
   */
  private async performSimulations(ctx: RoutingContext, regretBias: Ternary): Promise<RoutingDecision[]> {
    // 3 biases: Defensive (-1), Balanced (0), Exploratory (1)
    // Plus the historical regret bias
    const biases: Ternary[] = [-1, 0, 1];
    return biases.map(bias => {
      // Blend the bias with the regret lesson (Ternary math)
      const blendedComplexity = Math.max(-1, Math.min(1, bias + regretBias)) as Ternary;
      const simulatedCtx = { ...ctx, complexity: blendedComplexity };
      return this.traverseTree(this.decisionTree, simulatedCtx);
    });
  }

  /**
   * Decision Synthesis: Best Route or Combined Best
   */
  private synthesizeDecision(primary: RoutingDecision | null, simulations: RoutingDecision[]): string {
    if (primary && primary.candidateConfidence > 0.95) return primary.modelName;

    // Pick based on highest collective intelligence (priority/regret balance)
    const sorted = [...simulations].sort((a, b) =>
      (b.candidateConfidence - b.regretLikelihood) - (a.candidateConfidence - a.regretLikelihood)
    );
    return sorted[0]?.modelName || primary?.modelName || 'gemini-2.0-flash';
  }

  /**
   * THINK HELPER: Resource Futurist
   * Adjusts simulation bias based on real-time circuit health.
   */
  private runResourceFutureCheck(availableModels: ReadonlyArray<FreeModelConfig>): Ternary {
    const unhealthyModels = availableModels.filter(m => m.health && m.health.lastLatency && m.health.lastLatency > 5000);
    if (unhealthyModels.length > availableModels.length / 2) {
      logger.warn('Resource Futurist: High latency detected across cluster, shifting to Defensive bias.');
      return -1; // Force defensive bias
    }
    return 0;
  }

  /**
   * THINK HELPER: Adversarial Pre-Mortem
   * Predicts likely failure modes and biases toward robustness.
   */
  private runAdversarialPreMortem(prompt: string, tasks: Record<string, number>): Ternary {
    const highStakes = (tasks[TT.Architecture] || 0) > 0.7 || (tasks[TT.APIOrchestration] || 0) > 0.7;
    const isVague = prompt.length < 50;

    if (highStakes || isVague) {
      logger.info('Adversarial Pre-Mortem: High stakes or vague intent detected, shifting to Exploratory robustness.');
      return 1; // Force exploratory bias
    }
    return 0;
  }

  /**
   * Analyzes past lessons to derive a complexity bias
   */
  private calculateRegretBias(lessons: any[]): Ternary {
    if (lessons.length === 0) return 0;

    // Average regret of similar past tasks
    const avgRegret = lessons.reduce((acc, l) => acc + (l.regretLikelihood || 0), 0) / lessons.length;

    if (avgRegret > 0.6) return 1;  // High regret: push for higher complexity/intelligence
    if (avgRegret < 0.2) return -1; // Low regret: push for speed/efficiency
    return 0;
  }

  public traverseTree(
    node: TernaryNode,
    context: AssessedRoutingContext,
    path: Ternary[] = [],
    reasons: string[] = []
  ): RoutingDecision {
    if (node.kind === 'leaf') {
      const confidence = 1.0 - (path.filter(p => p === 0).length * 0.2);
      const regret = context.complexity > 0 && node.modelName.includes('7b') ? 0.8 : 0.1;

      // Sovereign Philosophy: Identifying alternatives
      const availableModels = context.availableModels;
      const couldBe = availableModels
        .filter(m => m.health?.isAvailable)
        .sort((a, b) => b.priority - a.priority)[0]?.name || 'gemini-3-pro-preview';

      const shouldBe = node.modelName;
      const shouldNotBe = availableModels
        .filter(m => !m.health?.isAvailable || m.health?.circuitLevel === -1)
        .map(m => m.name);

      return {
        modelName: node.modelName,
        path: path,
        reason: reasons.length > 0 ? reasons.join(' -> ') : `Defaulted to leaf: ${node.modelName}`,
        candidateConfidence: confidence,
        regretLikelihood: regret,
        philosophy: {
          couldBe,
          shouldBe,
          shouldNotBe
        }
      };
    }

    const decision = node.condition(context);
    const nextNode = decision < 0 ? node.left : decision === 0 ? node.center : node.right;
    const currentReason = node.description ? `${node.description} [${decision}]` : `Branch [${decision}]`;

    return this.traverseTree(nextNode, context, [...path, decision], [...reasons, currentReason]);
  }

  private checkCircuitHealth(ctx: AssessedRoutingContext): Ternary {
    const healthScores = ctx.availableModels.map(m => m.health?.circuitLevel ?? 1);
    const averageHealth = healthScores.length > 0 ? healthScores.reduce<number>((a, b) => a + b, 0) / healthScores.length : 1;

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
        output = execSync('ollama list', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
      } catch { }

      const grid = this.getAllModels().map(m => {
        const isPresent = m.type === MT.CloudFree || m.type === MT.Cloudflare
          ? !!process.env['GOOGLE_API_KEY'] || !!process.env['CLOUDFLARE_API_KEY']
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
      return this.getAllModels().map(m => ({ ...m, health: { isAvailable: false, circuitLevel: -1 } }));
    }
  }

  private applyCircuitBreaker(model: string, available: ReadonlyArray<FreeModelConfig>, complexity: Ternary): string {
    const state = this.circuitBreakers.get(model);
    if (state?.state === CS.Open) {
      if (Date.now() - state.lastFailure > state.cooldownMs) {
        state.state = CS.HalfOpen;
        this.circuitBreakers.set(model, state);
        return model;
      }

      const candidates = available.filter(m => m.health?.isAvailable && (m.health?.circuitLevel ?? 1) > -1);

      let preferred: FreeModelConfig[] = [];
      if (complexity === 1) {
        preferred = candidates.filter(m => m.type !== MT.Local);
      } else if (complexity === -1) {
        preferred = candidates.filter(m => m.type === MT.Local);
      }

      if (preferred.length > 0) {
        preferred.sort((a, b) => b.priority - a.priority);
        const best = preferred[0];
        if (best) return best.name;
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.priority - a.priority);
        const bestCandidate = candidates[0];
        if (bestCandidate) return bestCandidate.name;
      }

      const staticFallback = this.getAllModels().find(m => m.name === model)?.fallback ?? 'gemini-flash';
      return available.some(m => m.name === staticFallback) ? staticFallback : (available[0]?.name ?? model);
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
    const state = this.circuitBreakers.get(model) || {
      model,
      failures: 0,
      threshold: this.config.circuitBreakerThreshold || 3,
      state: CS.Closed,
      lastFailure: 0,
      cooldownMs: this.config.circuitBreakerCooldown || 60000
    };
    state.failures++;
    state.lastFailure = Date.now();
    if (state.failures >= state.threshold) state.state = CS.Open;
    this.circuitBreakers.set(model, state);
  }

  recordSuccess(model: string): void {
    const state = this.circuitBreakers.get(model);
    if (state) {
      state.failures = 0;
      state.state = CS.Closed;
    }
  }

  public routeByAbility(ability: MA): string {
    const available = this.getModelHealthGrid();
    const candidates = available
      .filter(m => m.health?.isAvailable && (m.health?.circuitLevel ?? 1) > -1)
      .filter(m => m.capabilities.includes(ability));

    if (candidates.length === 0) {
      if (ability === MA.Transcription) return 'cloudflare:@cf/openai/whisper';
      if (ability === MA.Vision) return 'cloudflare:vision';
      if (ability === MA.ImageGen) return 'cloudflare:media';
      return 'gemini:gemini-2.0-flash';
    }

    const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
    return sorted[0]?.name || 'gemini:gemini-2.0-flash';
  }

  getCircuitState(model: string): CircuitState {
    return this.circuitBreakers.get(model)?.state ?? CS.Closed;
  }
}