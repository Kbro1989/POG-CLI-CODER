/**
 * Core type definitions for POG-CODER-VIBE
 * All types are immutable by default for safety
 */

export const enum TaskType {
  Architecture = 'architecture',
  Syntax = 'syntax',
  Refactor = 'refactor',
  Debug = 'debug',
  Generate = 'generate',
  Test = 'test',
  Docs = 'docs',
  APIOrchestration = 'api-orchestration',
  Diagnostic = 'diagnostic',
  Esoteric = 'esoteric'
}

export const enum ModelType {
  Local = 'local',
  CloudFree = 'cloud-free'
}

export const enum CircuitState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN'
}

export interface ModelPerformance {
  readonly model: string;
  readonly taskType: TaskType;
  readonly extension: string;
  readonly latency: number;
  readonly success: boolean;
  readonly timestamp: number;
  readonly isFree: boolean;
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
  readonly regretLikelihood?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface IntentHistory {
  readonly sessionId: string;
  readonly query: string;
  readonly selectedModel: string;
  readonly success: boolean;
  readonly timestamp: number;
  readonly fileContext?: string;
  readonly executionTime: number;
  readonly snapshotId?: string;
}

export interface CircuitBreakerState {
  readonly model: string;
  failures: number;
  readonly threshold: number;
  state: CircuitState;
  lastFailure: number;
  readonly cooldownMs: number;
}

export interface FreeModelConfig {
  readonly name: string;
  readonly command: string;
  readonly type: ModelType;
  readonly capabilities: ReadonlyArray<string>;
  readonly fallback?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly priority: number; // 0-100, higher = preferred
  readonly health?: {
    readonly isAvailable: boolean;
    readonly circuitLevel: Ternary; // -1: Failing, 0: Degrading, 1: Healthy
    readonly lastLatency?: number | undefined;
  };
}

/**
 * Strictly-typed Ternary value for decision logic
 */
export type Ternary = -1 | 0 | 1;

/**
 * Ternary decision tree node for routing (Discriminated Union)
 */
export type TernaryNode =
  | {
    readonly kind: 'branch';
    readonly condition: (context: AssessedRoutingContext) => Ternary;
    readonly left: TernaryNode;   // -1 path - NO STRINGS
    readonly center: TernaryNode; // 0 path  - NO STRINGS
    readonly right: TernaryNode;  // 1 path  - NO STRINGS
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
  readonly path: ReadonlyArray<Ternary>;
  readonly reason: string;
  readonly candidateConfidence: number; // 0-1 scale
  readonly regretLikelihood: number;   // 0-1 scale, chance a better model was skipped
}

export interface RawRoutingContext {
  readonly prompt: string;
  readonly weightedTasks: Record<TaskType, number>; // Weighted analysis (0-1)
  readonly extension: string;
  readonly fileSize?: number | undefined;
  readonly historicalPerformance: ReadonlyArray<ModelPerformance>;
  readonly availableModels: ReadonlyArray<FreeModelConfig>; // Now includes health signals
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
  if (result.ok) {
    return result.value;
  }
  throw result.error;
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
  return result;
}

/**
 * Chain Result operations
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.ok) {
    return fn(result.value);
  }
  return result;
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
  readonly errorTrackerModelPath?: string | undefined;
  readonly enabledServices: string[];
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

export interface ModelResponse {
  readonly model: string;
  readonly response: string;
  readonly latency: number;
  readonly functionCalls?: FunctionCall[];
}
