import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';
import { ModelExecutor } from './ModelExecutor.js';
import { join } from 'path';
import pino from 'pino';
import { execSync } from 'child_process';
import { ModelInventory } from './ModelInventory.js';
import {
  ModelType,
  ModelAbility,
  CircuitState,
  SuccessRating,
  Result,
  VibeConfig,
  CognitiveChoice,
  Ternary,
  type ModelPerformance,
  type CircuitBreakerState,
  type FreeModelConfig
} from './models.js';

import { ContextBuilder } from '../context/ContextBuilder.js';
import { GeminiService } from './GeminiService.js';
import { VectorDB } from '../learning/VectorDB.js';
import { TaskClassifier } from './TaskClassifier.js';
import { ArchitectureDigest } from './ArchitectureDigest.js';
import { HexagramManager } from './HexagramManager.js';
import { CognitiveTranslator } from '../utils/CognitiveTranslator.js';

const MT = ModelType;
const MA = ModelAbility;
const CS = CircuitState;

// Modular Routing Implementation
import { CompositeStrategy } from '../routing/strategies/CompositeStrategy.js';
import { OverrideStrategy } from '../routing/strategies/OverrideStrategy.js';
import { AnalyticalStrategy } from '../routing/strategies/AnalyticalStrategy.js';
import { TernaryClassifierStrategy } from '../routing/strategies/TernaryClassifierStrategy.js';
import { FallbackStrategy } from '../routing/strategies/FallbackStrategy.js';
import { DefaultStrategy } from '../routing/strategies/DefaultStrategy.js';
import type { RoutingContext } from '../routing/types.js';

const logger = pino({
  name: 'Router',
  base: { hostname: 'POG-VIBE' }
});

export class FreeModelRouter {
  private readonly performanceDB: string;
  private readonly circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthCache: ReadonlyArray<FreeModelConfig> | null = null;
  private lastHealthCheck = 0;
  private readonly HEALTH_TTL = 30000;

  private readonly composite: CompositeStrategy;
  public contextBuilder: ContextBuilder;
  private readonly dynamicModels: FreeModelConfig[];
  private readonly gemini: GeminiService | undefined;
  private readonly hexagramManager: HexagramManager;

  constructor(private readonly config: VibeConfig, _gemini?: GeminiService) {
    this.gemini = _gemini;
    this.performanceDB = join(this.config.pogDir, 'free-model-performance.json');
    this.initializeDB();

    const vectorDB = new VectorDB(config);
    this.hexagramManager = new HexagramManager(vectorDB, config.projectId);
    this.hexagramManager.initialize().catch(err => logger.error({ err }, 'Failed to initialize HexagramManager'));

    this.contextBuilder = new ContextBuilder(vectorDB, config.projectRoot, config.projectId, new ModelExecutor(config, _gemini, this.hexagramManager));

    this.dynamicModels = ModelInventory.getAvailableModels(config);
    vectorDB.indexModelRegistry(ModelInventory.getRegistry()).catch(err => logger.error({ err }, 'Failed to index models'));

    // Modularized Composite Chain
    this.composite = new CompositeStrategy([
      new OverrideStrategy(),
      new AnalyticalStrategy(),
      new TernaryClassifierStrategy(),
      new FallbackStrategy(),
      new DefaultStrategy()
    ]);

    logger.info({ pogDir: config.pogDir, modelCount: this.getAllModels().length }, 'Modular Router Substrate initialized');
  }

  private getAllModels(): ReadonlyArray<FreeModelConfig> {
    return this.dynamicModels;
  }

  private initializeDB(): void {
    if (!existsSync(this.performanceDB)) {
      const dir = path.dirname(this.performanceDB);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.performanceDB, JSON.stringify({ history: [], version: '1.2.0' }, null, 2));
    }
  }

  async route(input: string | RoutingContext): Promise<Result<string>> {
    try {
      const routingContext: RoutingContext = typeof input === 'string'
        ? {
          prompt: input,
          weightedTasks: TaskClassifier.analyzeProbabilities(input),
          complexity: 'Yin',
          availableModels: [],
          metadata: { projectRoot: this.config.projectRoot }
        }
        : input;

      const prompt = routingContext.prompt;

      // Sovereign SENSE: Layer 1 intelligence
      const weightedTasks = TaskClassifier.analyzeProbabilities(prompt);
      const availableModels = this.getModelHealthGrid();

      if (availableModels.filter(m => m.health?.isAvailable).length === 0) {
        return { ok: false, error: new Error('No functional models found. Check Ollama status and API keys.') };
      }

      const staticComplexity = this.assessComplexity(prompt); // Use new method
      const complexity = (staticComplexity === 'YinYang' && this.gemini)
        ? await TaskClassifier.assessComplexityAI(prompt, this.gemini)
        : staticComplexity;

      const lessons = await this.contextBuilder.queryLessons(prompt);
      const architectureDigest = new ArchitectureDigest(this.config.projectRoot);
      const architectureAlignment = this.contextBuilder.getArchitectureAlignment(prompt, architectureDigest.getManifest());
      const goldenTemplates = await this.contextBuilder.getGoldenTemplates(prompt);

      const hexagram = this.hexagramManager.getInterpretation();

      // Sovereign Signals (Ternary Tree Inputs) via Cognitive Translator
      const localAvailability = CognitiveTranslator.translate(this.checkLocalAvailability());

      // Populate rich context for modular strategies (Ultimate Cognitive Upgrade)
      routingContext.weightedTasks = weightedTasks;
      routingContext.fileSize = 0; // Default if not provided
      routingContext.architectureAlignment = architectureAlignment; // Maintain raw for strategies that need it
      routingContext.goldenTemplates = goldenTemplates;
      routingContext.historicalPerformance = [...this.loadPerformanceHistory()];
      routingContext.lessons = lessons;
      routingContext.hexagram = hexagram;

      // Calculate and inject signals
      const historySignal = CognitiveTranslator.translate(this.checkPerformanceHistory(routingContext));
      const supervisorSignal = CognitiveTranslator.translate(this.checkSupervisorNeeds(routingContext));
      const architectureAlignmentState = CognitiveTranslator.translate(architectureAlignment);

      // Inject signals into metadata for strategies to use
      routingContext.metadata = {
        ...routingContext.metadata,
        ternarySignals: {
          localAvailability, // Now YaoState
          historySignal,     // Now YaoState
          supervisorSignal,  // Now YaoState
          architectureAlignmentState // Now YaoState
        },
        // Legacy support if strategies expect boolean - double check strategy implementation
        // For now, we keep raw values if needed, but the goal is to move to YaoState
      };

      // Phase 2 - Modular Routing Chain (Parallel THINK/Synthesis happens inside)
      const decision = await this.composite.route(routingContext);

      if (!decision) {
        return { ok: false, error: new Error('Routing chain failed to produce a decision.') };
      }

      // Phase 3 - Resilience Application
      const finalModel = this.applyCircuitBreaker(decision.model, availableModels, complexity as Ternary);

      logger.info({
        input: prompt.substring(0, 50) + '...',
        selected: finalModel,
        reasoning: decision.metadata.reasoning,
        source: decision.metadata.source,
        complexity,
        hexagram: routingContext.hexagram?.name || 'Unknown' // Sovereign Context
      }, 'Sovereign Routing complete');

      return { ok: true, value: finalModel };
    } catch (err) {
      logger.error({ err }, 'Routing execution failed');
      return { ok: false, error: err as Error };
    }
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

      const history = this.loadPerformanceHistory();

      const grid = this.getAllModels().map(m => {
        const isPresent = m.type === MT.CloudFree || m.type === MT.Cloudflare
          ? !!process.env['GOOGLE_API_KEY'] || !!process.env['CLOUDFLARE_API_KEY'] || !!process.env['HUGGINGFACE_API_KEY']
          : output.includes(m.name);

        const state = this.circuitBreakers.get(m.name);
        let circuitLevel: CognitiveChoice = 'Yang';
        if (state?.state === CS.Open) circuitLevel = 'Yin';
        else if (state?.state === CS.HalfOpen || (state?.failures ?? 0) > 0) circuitLevel = 'YinYang';

        // Populate lastLatency from performance history
        const modelPerf = history.filter(h => h.model === m.name);
        const lastPerfEntry = modelPerf[modelPerf.length - 1];
        const lastLatency = lastPerfEntry?.latency;

        return {
          ...m,
          health: {
            isAvailable: isPresent,
            circuitLevel,
            lastLatency
          }
        } as FreeModelConfig; // Cast to ensure health grid compatibility
      });

      this.healthCache = grid;
      this.lastHealthCheck = Date.now();
      return grid;
    } catch {
      return this.getAllModels().map(m => ({ ...m, health: { isAvailable: false, circuitLevel: 'Yin' } }));
    }
  }

  private applyCircuitBreaker(model: string, available: ReadonlyArray<FreeModelConfig>, complexity: CognitiveChoice): string {
    const state = this.circuitBreakers.get(model);
    if (state?.state === CS.Open) {
      if (Date.now() - state.lastFailure > state.cooldownMs) {
        state.state = CS.HalfOpen;
        this.circuitBreakers.set(model, state);
        return model;
      }

      const candidates = available.filter(m => m.health?.isAvailable && m.health?.circuitLevel !== 'Yin');

      let preferred: FreeModelConfig[] = [];
      if (complexity === 'Yang') {
        preferred = candidates.filter(m => m.type !== MT.Local);
      } else if (complexity === 'Yin') {
        preferred = candidates.filter(m => m.type === MT.Local);
      }

      if (preferred.length > 0) {
        preferred.sort((a, b) => b.priority - a.priority);
        const best = preferred[0];
        if (best) return best.name;
      }


      // Sovereign Survival: Bunker Mode Fallback
      // If we are here, the primary model failed. We MUST find a local survivor.
      const localSurvivor = available.find(m => m.type === MT.Local && m.health?.isAvailable);
      if (localSurvivor) {
        logger.warn({ output: 'Cloud failed. Switching to Bunker Mode.', survivor: localSurvivor.name }, 'Sovereign Survival Protocol Activated');
        return localSurvivor.name;
      }

      const staticFallback = this.getAllModels().find(m => m.name === model)?.fallback ?? 'gemini-2.0-flash';
      return available.some(m => m.name === staticFallback) ? staticFallback : (available[0]?.name ?? model);
    }
    return model;
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

  public routeByAbility(ability: ModelAbility): string {
    const available = this.getModelHealthGrid();
    const candidates = available
      .filter(m => m.health?.isAvailable && m.health?.circuitLevel !== 'Yin')
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

  // --- Semantic Logic Implementation (Sovereign Decision Tree) ---

  private assessComplexity(prompt: string): CognitiveChoice {
    let score = 0;

    // Word count > 50
    if (prompt.split(/\s+/).length > 50) score++;

    // Multi-step indicator
    if (/then|after|next/i.test(prompt)) score++;

    // Architecture keywords
    if (/design|architect|system|pattern/i.test(prompt)) score += 2;

    // Multi-file indicator
    if (/files|modules|components/i.test(prompt)) score++;

    // Return semantic decision
    if (score >= 4) return 'Yang';    // Complex -> Gemini Pro/Thinking
    if (score >= 2) return 'YinYang'; // Medium -> Qwen/Flash/Cloudflare
    return 'Yin';                     // Simple -> Ollama/Llama
  }

  private checkLocalAvailability(): CognitiveChoice {
    const available = this.getModelHealthGrid().filter(m => m.type === MT.Local && m.health?.isAvailable);
    const total = this.getAllModels().filter(m => m.type === MT.Local).length;

    if (total === 0) return 'Yin'; // No local models configured

    const ratio = available.length / total;

    if (ratio >= 0.8) return 'Yang';    // Most available
    if (ratio >= 0.4) return 'YinYang'; // Some available
    return 'Yin';                       // Few available
  }

  private checkPerformanceHistory(context: RoutingContext): CognitiveChoice {
    const history = this.loadPerformanceHistory();
    // Simple extension match for now, can be expanded to TaskType
    const relevant = history.filter(p => p.extension === context.extension);

    if (relevant.length === 0) return 'YinYang'; // No history

    const avgLatency = relevant.reduce((sum, p) => sum + p.latency, 0) / relevant.length;
    const successRate = relevant.filter(p => p.success === SuccessRating.Success).length / relevant.length;

    if (successRate > 0.9 && avgLatency < 2000) return 'Yang';    // Excellent
    if (successRate > 0.7 && avgLatency < 5000) return 'YinYang'; // Average
    return 'Yin';                                                 // Poor
  }

  private checkSupervisorNeeds(context: RoutingContext): CognitiveChoice {
    const containsArchitecture = /design|architect|refactor|system/i.test(context.prompt);
    // context.fileSize isn't always populated, assume 0 if missing
    const isLargeModule = (context.fileSize || 0) > 20000;

    if (containsArchitecture && isLargeModule) return 'Yang';    // Gemini Thinking
    if (isLargeModule) return 'YinYang';                         // Gemini Flash (Context King)
    return 'Yin';                                                // Simulation Substrate (Top Brain)
  }
}
