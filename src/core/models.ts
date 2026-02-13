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
export type CognitiveChoice = 'Yang' | 'Yin' | 'YinYang'; // Yes | No | Maybe
export type Ternary = CognitiveChoice;
export type TernaryDecision = CognitiveChoice;
export type StrategicDirection = 'Forward' | 'Back' | 'Reflect'; // Escalate | Revert | Audit
export type MetabolicState = 'Hyper' | 'Steady' | 'Dormant'; // High | Normal | Low


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

export type ServiceHealthState = 'READY' | 'RATE_LIMITED' | 'CRITICAL_FAILURE';

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
export enum BuildStatus {
  Failed = 'Yin',
  Warning = 'YinYang',
  Passed = 'Yang'
}

export enum HealthStatus {
  Critical = 'Yin',
  Degraded = 'YinYang',
  Ready = 'Yang'
}

export enum ResourcePressure {
  Critical = 'Yin',
  High = 'YinYang',
  Optimal = 'Yang'
}

export enum UserEngagement {
  Idle = 'Yin',
  Passive = 'YinYang',
  Active = 'Yang'
}

export enum SuccessRating {
  Failure = 'Yin',
  Partial = 'YinYang',
  Success = 'Yang'
}

export enum ExecutionEscalation {
  Safe = 'Yin',
  Standby = 'YinYang',
  Aggressive = 'Yang'
}

export enum CostTier {
  Paid = 'Yin',
  Credits = 'YinYang',
  Free = 'Yang'
}

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
  readonly criticModel?: string | undefined;
  readonly planningModel?: string | undefined;
  readonly codingModel?: string | undefined;
  readonly healThreshold?: 'low' | 'medium' | 'high' | 'critical' | undefined;
  readonly sovereignRoot?: string | undefined;
  readonly pogApiUrl?: string | undefined;
  readonly aiContextPath?: string | undefined;
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
}

export interface ModelResponse {
  readonly model: string;
  readonly response: string;
  readonly latency: number;
  readonly functionCalls?: FunctionCall[];
  readonly provenance?: CascadeTracking;
}
