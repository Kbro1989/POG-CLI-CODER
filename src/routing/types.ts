/**
 * @license
 * POG-CODER-VIBE
 * Routing Decision Types
 * Adapted from Google's gemini-cli routing patterns for ternary architecture
 */

// Types are defined locally - no external imports needed for RoutingDecision

/**
 * The output of a routing decision. Specifies which model tier to use and why.
 */
export interface RoutingDecision {
    /** The model tier or specific model identifier (e.g., 'local', 'edge', 'cloud', or 'qwen2.5:3b') */
    model: string;

    /**
     * Metadata about the routing decision for telemetry and debugging.
     */
    metadata: {
        /** Source of the routing decision (e.g., 'composite/classifier', 'override', 'fallback') */
        source: string;

        /** Time taken to make the routing decision in milliseconds */
        latencyMs: number;

        /** Human-readable reasoning for why this model was selected */
        reasoning: string;

        /** Optional error message if the decision was made due to a failure */
        error?: string;
    };
}

/**
 * Context provided to routing strategies for making decisions.
 */
export interface RoutingContext {
    /** The user's prompt/request */
    prompt: string;

    /** Conversation history for context-aware routing (generic for flexibility) */
    history?: unknown[];

    /** Optional abort signal to cancel routing if needed */
    signal?: AbortSignal;

    /** Additional metadata that may influence routing (e.g., file count, complexity hints) */
    metadata?: Record<string, unknown>;
}

/**
 * The core interface that all routing strategies must implement.
 * Strategies can decline a request by returning null, allowing the next strategy to try.
 */
export interface RoutingStrategy {
    /** The name of the strategy (e.g., 'fallback', 'override', 'classifier') */
    readonly name: string;

    /**
     * Determines which model to use for a given request context.
     * 
     * @param context The full context of the request
     * @returns A promise that resolves to a RoutingDecision, or null if the strategy cannot handle this request
     */
    route(context: RoutingContext): Promise<RoutingDecision | null>;
}

/**
 * A strategy that is guaranteed to return a decision (never returns null).
 * This is used as the final strategy in a composite chain to ensure termination.
 */
export interface TerminalStrategy extends RoutingStrategy {
    /**
     * Determines which model to use for a given request context.
     * Terminal strategies MUST return a decision (cannot return null).
     * 
     * @param context The full context of the request
     * @returns A promise that resolves to a RoutingDecision (never null)
     */
    route(context: RoutingContext): Promise<RoutingDecision>;
}

/**
 * Model tier classification for ternary routing.
 */
export enum ModelTier {
    /** Local Ollama models for simple, fast operations (1-3 tool calls) */
    Local = 'local',

    /** Edge/Hybrid for medium complexity (4-6 tool calls, writes + reasoning) */
    Edge = 'edge',

    /** Cloud Gemini for complex operations (7+ tool calls, architecture, debugging) */
    Cloud = 'cloud',
}

/**
 * Classification result from the ternary classifier.
 */
export interface TernaryClassification {
    /** The recommended tier for this request */
    tier: ModelTier;

    /** Estimated number of tool calls required */
    estimatedToolCalls: number;

    /** Human-readable reasoning for the classification decision */
    reasoning: string;

    /** Complexity factors that influenced the decision */
    complexityFactors: {
        hasStrategicPlanning: boolean;
        hasDebugging: boolean;
        hasMultipleFiles: boolean;
        hasHighAmbiguity: boolean;
    };

    /** Confidence score (0-1) in this classification */
    confidence: number;
}
