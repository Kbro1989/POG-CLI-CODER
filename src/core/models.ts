/**
 * Core type definitions for POG-CODER-VIBE
 * All types are immutable by default for safety
 */

export enum TaskType {
  Architecture = 'architecture',
  Syntax = 'syntax',
  Refactor = 'refactor',
  Debug = 'debug',
  Generate = 'generate',
  Test = 'test',
  Docs = 'docs',
  APIOrchestration = 'api-orchestration',
  Diagnostic = 'diagnostic',
  Monitor = 'monitor',
  Intervention = 'intervention',
  Esoteric = 'esoteric',
  Conversational = 'conversational'
}

export enum ModelAbility {
  Chat = 'CHAT',
  Code = 'CODE',
  Vision = 'VISION',
  Transcription = 'TRANSCRIPTION',
  TTS = 'TTS',
  ImageGen = 'IMAGE_GEN',
  VideoGen = 'VIDEO_GEN',
  Embedding = 'EMBEDDING',
  Search = 'SEARCH'
}

export enum ModelType {
  Local = 'local',
  CloudFree = 'cloud-free',
  Cloudflare = 'cloudflare'
}

export enum CircuitState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN'
}

/**
 * Sovereign Decision Taxonomy - Domain-aware decision types
 * Replacing industrial numbers with organic, semantic states.
 */
import * as z from 'zod';

/**
 * Domain-Specific Semantic Enums for Stage-based Decisions
 */
export enum BuildStatus {
  Failed = 'FAILED',
  Warning = 'WARNING',
  Passed = 'PASSED',
  All = 'ALL'
}

export enum HealthStatus {
  Critical = 'CRITICAL',
  Degraded = 'DEGRADED',
  Ready = 'READY',
  Silence = 'SILENCE', // Receptive Yield
  All = 'ALL'
}

export enum ResourcePressure {
  Critical = 'CRITICAL',
  High = 'HIGH',
  Optimal = 'OPTIMAL',
  All = 'ALL'
}

export enum UserEngagement {
  Idle = 'IDLE',
  Passive = 'PASSIVE',
  Active = 'ACTIVE',
  All = 'ALL'
}

export enum SuccessRating {
  Failure = 'FAILURE',
  Partial = 'PARTIAL',
  Success = 'SUCCESS',
  All = 'ALL'
}

export enum ExecutionEscalation {
  Safe = 'SAFE',
  Standby = 'STANDBY',
  Aggressive = 'AGGRESSIVE',
  All = 'ALL'
}

export enum CostTier {
  Paid = 'PAID',
  Credits = 'CREDITS',
  Free = 'FREE',
  All = 'ALL'
}

/**
 * Sovereign Decision Taxonomy - Domain-aware decision types
 * Replacing industrial numbers with organic, semantic states.
 */
export enum YaoState {
  OldYang = 0,   // dec: "◯" | sym: "Expansion"   | emo: "Decisive"    | act: "Escalate/Transform"
  YoungYin = 1,  // dec: "⚋" | sym: "Stillness"   | emo: "Quiet"       | act: "Observe/Receptive"
  YoungYang = 2, // dec: "⚊" | sym: "Momentum"    | emo: "Steady"      | act: "Execute/Maintain"
  OldYin = 3,    // dec: "✕" | sym: "Contraction" | emo: "Melancholy" | act: "Withdraw/Archive"
  Transition = 4, // dec: "░" | sym: "Chaos"       | emo: "Surprised"   | act: "Re-index/Pivot"

  // RSC Gameplay States
  RSC_Idle = 10,
  RSC_Combat = 11,
  RSC_Trading = 12,
  RSC_Questing = 13,
  RSC_Skilling = 14,
  RSC_Exploring = 15,
  RSC_Fleeing = 16,
  RSC_Social = 17,
  RSC_Dead = 18,
  All = 99
}

/**
 * YangState: The Qualities of Active Force
 * Granular descriptors for when the system is in Yang (1) or Old Yang (0).
 */
export enum YangState {
  Creative = 'CREATIVE (☀️) [Pinnacle of Force]',   // Pure generative power (Hex 1)
  Decisive = 'DECISIVE (🗡️) [The Sword of Insight]',   // Cutting through obstacles (Old Yang)
  Steady = 'STEADY (⚓) [The Anchor of Execution]',       // Solid execution (Young Yang)
  Arousing = 'AROUSING (⚡) [The Spark of Innovation]',   // Sudden change/action (Hex 51)
  Maximal = 'MAXIMAL (💎) [Overflowing Abundance]',     // Reaching peak potential (Hex 14)
}

/**
 * YinState: The Qualities of Receptive Force
 * Granular descriptors for when the system is in Yin (0) or Old Yin (3).
 */
export enum YinState {
  Receptive = 'RECEPTIVE (🌙) [The Womb of Creation]', // Pure support/refactor (Hex 2)
  Quiet = 'QUIET (🌑) [The Midnight Pool]',        // Passive observation (Young Yin)
  Melancholy = 'MELANCHOLY (🌊) [The Ebbing Tide]', // Contraction/Archival (Old Yin)
  Modest = 'MODEST (🌱) [The Gentle Valley]',      // Reducing excess (Hex 15)
  Stopping = 'STOPPING (🏔️) [The Timeless Mountain]',   // Stillness/Freeze (Hex 52)
}

/**
 * Emotional States for Sovereign Cognition
 * Maps cognitive results to a spectrum of AI "feelings" or operational temperaments.
 */
export enum EmotionalState {
  Inspired = 'INSPIRED (⚡)',    // Creative Yang flow
  Steady = 'STEADY (⚓)',      // Stable Yang execution
  Curious = 'CURIOUS (🔍)',     // Exploratory YinYang
  Agitated = 'AGITATED (🔥)',   // Conflicted/Error state
  Quiet = 'QUIET (🌑)',       // Sovereign Silence / Receptive Yin
  Decisive = 'DECISIVE (🗡️)',  // Old Yang escalation
  Melancholy = 'MELANCHOLY (🌊)', // Old Yin retreat/withdrawal
  Zen = 'ZEN (🌀)',           // Balanced All state
  Surprised = 'SURPRISED (❗)'   // High transition change
}

/**
 * Binary State for absolute controls (Toggles, Success/Failure)
 */
export enum BinaryState {
  Yang = 1, // dec: "⚊" | sym: "Light"   | emo: "Enabled"
  Yin = 0,  // dec: "⚋" | sym: "Shadow" | emo: "Disabled"
  All = 2   // dec: "☯" | sym: "Unity"  | emo: "Whole"
}

/**
 * Sovereign Taxonomy: The Unified Source of Truth for State Meanings
 * Maps every operational signal to its symbolic, emotional, and operational core.
 */
export const SovereignTaxonomy = {
  BuildStatus: {
    [BuildStatus.Passed]: { state: YaoState.YoungYang, emotion: EmotionalState.Steady, symbol: '✅', meaning: 'Foundation Secure' },
    [BuildStatus.Failed]: { state: YaoState.YoungYin, emotion: EmotionalState.Agitated, symbol: '❌', meaning: 'Structural Collapse' },
    [BuildStatus.Warning]: { state: YaoState.OldYang, emotion: EmotionalState.Surprised, symbol: '⚠️', meaning: 'Foundation Shifting' }
  },
  HealthStatus: {
    [HealthStatus.Ready]: { state: YaoState.YoungYang, emotion: EmotionalState.Steady, symbol: '❇️', meaning: 'Metabolic Flow' },
    [HealthStatus.Critical]: { state: YaoState.YoungYin, emotion: EmotionalState.Agitated, symbol: '💔', meaning: 'Organ Failure' },
    [HealthStatus.Degraded]: { state: YaoState.OldYin, emotion: EmotionalState.Melancholy, symbol: '📉', meaning: 'Vitality Leaking' },
    [HealthStatus.Silence]: { state: YaoState.YoungYin, emotion: EmotionalState.Quiet, symbol: '🤫', meaning: 'Receptive Stasis' }
  },
  ResourcePressure: {
    [ResourcePressure.Optimal]: { state: YaoState.YoungYang, emotion: EmotionalState.Inspired, symbol: '🍃', meaning: 'Breathable Substrate' },
    [ResourcePressure.High]: { state: YaoState.OldYin, emotion: EmotionalState.Agitated, symbol: '🌪️', meaning: 'Atmospheric Weight' },
    [ResourcePressure.Critical]: { state: YaoState.OldYin, emotion: EmotionalState.Melancholy, symbol: '🌋', meaning: 'Magmatic Compression' }
  },
  UserEngagement: {
    [UserEngagement.Active]: { state: YaoState.YoungYang, emotion: EmotionalState.Inspired, symbol: '🤝', meaning: 'Sovereign Alignment' },
    [UserEngagement.Passive]: { state: YaoState.YoungYin, emotion: EmotionalState.Curious, symbol: '👀', meaning: 'Sovereign Observation' },
    [UserEngagement.Idle]: { state: YaoState.YoungYin, emotion: EmotionalState.Quiet, symbol: '💤', meaning: 'Sovereign Slumber' }
  },
  SuccessRating: {
    [SuccessRating.Success]: { state: YaoState.YoungYang, emotion: EmotionalState.Steady, symbol: '🌟', meaning: 'Triumph of Logic' },
    [SuccessRating.Partial]: { state: YaoState.OldYang, emotion: EmotionalState.Surprised, symbol: '🌗', meaning: 'Fragmented Victory' },
    [SuccessRating.Failure]: { state: YaoState.YoungYin, emotion: EmotionalState.Agitated, symbol: '🌑', meaning: 'Shadow Descent' }
  },
  CostTier: {
    [CostTier.Free]: { state: YaoState.YoungYang, emotion: EmotionalState.Inspired, symbol: '💸', meaning: 'Abundant Charity' },
    [CostTier.Credits]: { state: YaoState.OldYin, emotion: EmotionalState.Curious, symbol: '🪙', meaning: 'Weighted Exchange' },
    [CostTier.Paid]: { state: YaoState.YoungYin, emotion: EmotionalState.Melancholy, symbol: '💳', meaning: 'Sovereign Debt' }
  }
} as const;

export type CognitiveChoice = 'Yang' | 'Yin' | 'YinYang' | 'All' | YaoState | BinaryState; // Yes | No | Maybe | All | Organic State
export type Ternary = 'Yang' | 'Yin' | 'YinYang' | 'All';
export type TernaryDecision = CognitiveChoice;

export interface TriAxis {
  axis: 'X' | 'Y' | 'Z' | 'Time' | 'Space' | 'Moral' | 'Action' | 'Survival' | 'Social';
  positive: string; // e.g. "Should", "Forward", "Yes", "Attack", "Engage"
  negative: string; // e.g. "Shouldn't", "Back", "No", "Flee", "Ignore"
  neutral: string;  // e.g. "Maybe", "Stasis", "Possible", "Observe", "Idle"
}

export interface OracleQuery {
  intent: string;
  axes: [TriAxis, TriAxis, TriAxis]; // The 3 Questions
  candidates?: string[]; // Optional pre-defined options, otherwise generated
}
export type StrategicDirection = 'Forward' | 'Back' | 'Reflect'; // Escalate | Revert | Audit
export type MetabolicState = 'Hyper' | 'Steady' | 'Dormant'; // High | Normal | Low

/**
 * Script Language Support - Multi-engine awareness for game modding & automation
 * Bridges RSC gameplay, Morrowind modding, and general scripting needs.
 */
export enum ScriptLanguage {
  TypeScript = 'typescript',
  JavaScript = 'javascript',
  Lua = 'lua',               // Morrowind MWSE, Roblox, WoW addons
  MWSE = 'mwse',             // Morrowind Script Extender (Lua-based)
  TESScript = 'tes-script',  // Morrowind vanilla scripting
  RuneScript = 'runescript',  // RuneScape Classic server scripts
  Python = 'python',
  Bash = 'bash',
  PowerShell = 'powershell',
  SQL = 'sql',               // Database queries (preservation.db, etc)
  JSON = 'json',             // Config/data definitions
  YAML = 'yaml',             // Config files
  GLSL = 'glsl',             // Shader language for model viewers
  WGSL = 'wgsl'              // WebGPU shading language
}

/**
 * Maps RSC gameplay states to their Yao (Old/New) logic equivalents.
 * Old states = transforming/changing. New (Young) states = stable/holding.
 */
export interface RSCYaoMapping {
  readonly gameState: YaoState;
  readonly yaoClassification: 'OldYang' | 'YoungYin' | 'YoungYang' | 'OldYin' | 'Transition';
  readonly description: string;
  readonly energy: MetabolicState;  // How much metabolic energy this state burns
  readonly scriptContext?: ScriptLanguage; // What language governs this state
}

/**
 * Universal Viewer Target — What the Sovereign Eye is perceiving.
 * Supports any visual/textual source: localhost, wrangler dev, HTML, RSC, windows.
 */
export interface ViewerTarget {
  readonly sourceType: 'url' | 'html' | 'rsc' | 'window' | 'file';
  readonly target: string;
  readonly viewport?: { width: number; height: number };
  readonly capturedAt?: number;
  readonly scriptContext?: ScriptLanguage;
}

export interface StyleProfile {
  readonly readabilityScore: number;
  readonly avgSentenceLength: number;
  readonly uniqueWordRatio: number;
  readonly tone: 'simple' | 'complex' | 'academic' | 'unknown';
  readonly author?: string;
  readonly title?: string;
}


export interface ModelPerformance {
  readonly model: string;
  readonly taskType: TaskType;
  readonly extension: string;
  readonly latency: number;
  readonly success: SuccessRating;
  readonly timestamp: number;
  readonly isFree: CostTier;
  readonly memoryUsage?: number;
  readonly tokenCount?: number;
}

export interface Lesson {
  readonly id: string;
  readonly embedding: Float32Array; // Ownership: Copied from Gemini result, managed by VectorDB
  readonly text: string;
  readonly sessionId: string;
  readonly errorType: string;
  readonly createdAt: number;
  readonly projectId?: string;
  readonly regretLikelihood?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface IntentHistory {
  readonly sessionId: string;
  readonly query: string;
  readonly selectedModel: string;
  readonly success: SuccessRating;
  readonly timestamp: number;
  readonly fileContext?: string;
  readonly executionTime: number;
  readonly snapshotId?: string;
  readonly output: string | undefined;
  readonly data?: unknown;
}

export interface CircuitBreakerState {
  readonly model: string;
  failures: number;
  readonly threshold: number;
  state: CircuitState;
  lastFailure: number;
  readonly cooldownMs: number;
}

export type ServiceHealthState = 'READY' | 'RATE_LIMITED' | 'CRITICAL_FAILURE' | 'CIRCUIT_OPEN' | 'OFF_GRID' | 'SOVEREIGN_SILENCE';

export interface HealthReport {
  readonly state: ServiceHealthState;
  readonly cooldownSeconds: number;
  readonly message?: string;
}

export interface FreeModelConfig {
  readonly name: string;
  readonly command: string;
  readonly type: ModelType;
  readonly capabilities: ReadonlyArray<ModelAbility | string>;
  readonly fallback?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly priority: number; // 0-100, higher = preferred
  readonly health?: {
    readonly isAvailable: boolean;
    readonly circuitLevel: CognitiveChoice; // Yang: Healthy, Yin: Failing, YinYang: Degrading
    readonly lastLatency?: number | undefined;
    readonly cooldownSeconds?: number;
  };
}

/**
 * Domain-Specific Semantic Enums for Stage-based Decisions
 */

/**
 * Ternary decision tree node for routing (Discriminated Union)
 */
export type TernaryNode =
  | {
    readonly kind: 'branch';
    readonly condition: (context: AssessedRoutingContext) => CognitiveChoice;
    readonly left: TernaryNode;   // Yin path
    readonly center: TernaryNode; // YinYang path
    readonly right: TernaryNode;  // Yang path
    readonly description?: string; // For explainability
  }
  | {
    readonly kind: 'leaf';
    readonly modelName: string;
  };

/**
 * Result of a routing decision, including explainability data
 */
export interface RoutingDecision {
  readonly modelName: string;
  readonly path: ReadonlyArray<CognitiveChoice>;
  readonly reason: string;
  readonly candidateConfidence: number; // 0-1 scale
  readonly regretLikelihood: number;   // 0-1 scale, chance a better model was skipped
  readonly philosophy?: {
    readonly couldBe: string;      // The "High Intelligence" exploratory route
    readonly shouldBe: string;     // The "Ideal/Standard" selected route
    readonly shouldNotBe: string[]; // The "Forbidden/Suboptimal" rejected routes
  };
}

export interface RawRoutingContext {
  readonly prompt: string;
  readonly weightedTasks: Record<TaskType, number>; // Weighted analysis (0-1)
  readonly extension: string;
  readonly fileSize?: number | undefined;
  readonly historicalPerformance: ReadonlyArray<ModelPerformance>;
  readonly availableModels: ReadonlyArray<FreeModelConfig>; // Now includes health signals
  readonly architectureAlignment?: string[]; // Phase 10: Sense Helper
  readonly goldenTemplates?: string[]; // Phase 10: Sense Helper
}

export interface AssessedRoutingContext extends RawRoutingContext {
  readonly complexity: Ternary;
}

/**
 * Alias for the initial context used during routing
 */
export type RoutingContext = RawRoutingContext;

export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export interface LimbTool {
  readonly name: string;
  readonly description: string;
  readonly isAI?: boolean;
  readonly parameters: {
    readonly type: 'object';
    readonly properties: Record<string, unknown>;
    readonly required?: ReadonlyArray<string>;
  };
  readonly schema?: z.ZodObject<Record<string, z.ZodTypeAny>>;
  readonly handler: (args: Record<string, unknown>) => Promise<Result<unknown>>;
}

/**
 * Type guard for Result success
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard for Result failure
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Unwrap Result or throw
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok === true) {
    return (result as { ok: true; value: T }).value;
  }
  throw (result as { ok: false; error: E }).error;
}

/**
 * Unwrap Result or return default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/**
 * Map Result value
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.ok) {
    return { ok: true, value: fn(result.value) };
  }
  return result as unknown as Result<U, E>;
}

/**
 * Chain Result operations
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok === true) {
    return fn((result as { ok: true; value: T }).value);
  }
  return result as unknown as Result<U, E>;
}

export interface LogContext {
  readonly component: string;
  readonly sessionId?: string;
  readonly model?: string;
}

export interface VibeConfig {
  readonly pogDir: string;
  readonly projectRoot: string;
  readonly environment: 'offline' | 'online' | 'local' | 'unknown';
  readonly agentName: string;
  readonly wsPort: number;
  readonly maxSnapshotAge: number;
  readonly circuitBreakerThreshold: number;
  readonly circuitBreakerCooldown: number;
  readonly embeddingDimensions: number;
  readonly logLevel: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  readonly projectId: string;
  readonly ollamaModelsPath?: string | undefined;
  readonly gutenbergPath?: string | undefined;
  readonly errorTrackerModelPath?: string | undefined;
  readonly workspaces?: string[];
  readonly enabledServices: string[];
  readonly cloudflareGatewayUrl?: string | undefined;
  readonly cloudflareAccountId?: string | undefined;
  readonly cloudflareApiToken?: string | undefined;
  readonly monitorModel?: string | undefined;
  readonly snapshotModel?: string | undefined;
  readonly thinkingAdminModel?: string | undefined;
  readonly proCoderModel?: string | undefined;
  readonly criticModel?: string | undefined;
  readonly planningModel?: string | undefined;
  readonly codingModel?: string | undefined;
  readonly healThreshold?: 'low' | 'medium' | 'high' | 'critical' | undefined;
  readonly sovereignRoot?: string | undefined;
  readonly pogApiUrl?: string | undefined;
  readonly aiContextPath?: string | undefined;
  readonly rootStack: string[];
  readonly identity?: {
    readonly email: string;
    readonly name: string;
    readonly source: 'env' | 'gcloud' | 'discovery';
  };
  readonly activeStyle?: StyleProfile | undefined;
  readonly sovereignBoundaries?: {
    readonly maxLatencyMs?: number;
    readonly dailyBudgetUsd?: number;
    readonly allowCloud?: boolean;
    readonly forceOffline?: boolean;
  };
}

export const enum AgentTerminateMode {
  GOAL = 'GOAL',
  TIMEOUT = 'TIMEOUT',
  MAX_TURNS = 'MAX_TURNS',
  ABORTED = 'ABORTED',
  ERROR = 'ERROR',
  ERROR_NO_COMPLETE_TASK_CALL = 'ERROR_NO_COMPLETE_TASK_CALL',
}

export type AgentTurnResult =
  | {
    status: 'continue';
    nextMessage: string;
    model?: string;
  }
  | {
    status: 'stop';
    terminateReason: AgentTerminateMode;
    finalResult: string | null;
    model?: string;
  };
export interface FunctionCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

export interface ValidationError {
  readonly reason: string;
  readonly pattern?: string;
  readonly suggestion?: string;
}

/**
 * Result of a validation check
 */
export type ValidationResult = Result<true, ValidationError>;

export interface ArchitectureManifest {
  readonly domainModel: Record<string, {
    readonly file: string;
    readonly properties: string[];
  }>;
  readonly dependencyRules: Record<string, string[]>;
  readonly primaryGoal: string;
}

export interface Intent {
  readonly prompt: string;
  readonly files?: ReadonlyArray<string>;
  readonly context?: unknown;
  readonly tools?: ReadonlyArray<unknown>;
}

export interface Execution {
  readonly output: string;
  readonly data?: unknown;
  readonly filesModified?: ReadonlyArray<string>;
  readonly commandsRun?: ReadonlyArray<string>;
}

export interface ExecutionStep {
  readonly tool: string;
  readonly args: string[];
  readonly reasoning: string;
  readonly rollback?: string;
}

export interface ExecutionPlan {
  readonly goal: string;
  readonly steps: ReadonlyArray<ExecutionStep>;
}

export interface ExecutionContext {
  readonly prompt: string;
  readonly rawPrompt?: string; // Stored for intentional stacking
  readonly filePath?: string;
  readonly sessionId: string;
  readonly startTime: number;
  plan?: ExecutionPlan;
  currentStepId?: number;
  readonly imageBase64?: string;
  readonly force?: ExecutionEscalation;
}

export interface CascadeTier {
  readonly name: string;
  readonly status: 'success' | 'failure' | 'skipped';
  readonly error?: string;
  readonly timestamp: number;
}

export interface CascadeTracking {
  readonly tiers: ReadonlyArray<CascadeTier>;
  readonly finalModel: string;
  readonly latency: number;
  readonly generationMode: 'AI' | 'CLI-Fallback' | 'Ghost-Limb';
  readonly failureCount: number;
  readonly cognitivePulse: YaoState;
}

export interface ModelResponse {
  readonly model: string;
  readonly response: string;
  readonly latency: number;
  readonly functionCalls?: FunctionCall[];
  readonly provenance?: CascadeTracking;
  readonly cognitivePulse: YaoState;
}
