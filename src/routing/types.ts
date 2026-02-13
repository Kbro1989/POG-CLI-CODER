/**
 * @license
 * POG-CODER-VIBE
 * Routing Decision Types
 * Adapted from Google's gemini-cli routing patterns for ternary architecture
 */

// Types are defined locally - no external imports needed for RoutingDecision

/**
 * The output of a routing decision. Specifies which model identifier to use and why.
 */
export interface RoutingDecision {
    /** The specific model name (e.g., 'gemini-2.0-flash', 'qwen2.5-coder:7b') */
    model: string;

    /**
     * Metadata about the routing decision for telemetry and debugging.
     */
    metadata: {
        /** Source of the routing decision (e.g., 'override', 'analytical', 'default') */
        source: string;

        /** Time taken to make the routing decision in milliseconds */
        latencyMs: number;

        /** Human-readable reasoning for why this model was selected */
        reasoning: string;

        /** Optional path taken through the ternary tree */
        path?: number[];

        /** Optional error message if the decision was made due to a failure */
        error?: string;
    };
}

import type { CognitiveChoice } from '../core/models.js';

/**
 * Context provided to routing strategies for making decisions.
 */
export interface RoutingContext {
    /** The user's prompt/request */
    prompt: string;

    /** Task weights derived from classification */
    weightedTasks?: Record<string, number>;

    /** Primary file extension for context */
    extension?: string;

    /** File size in bytes */
    fileSize?: number;

    /** Ternary complexity score ('Yin', 'YinYang', 'Yang') */
    complexity?: CognitiveChoice;

    /** Cloudflare and Ollama model health grid */
    availableModels?: any[];

    /** Architecture alignment patterns */
    architectureAlignment?: string[];

    /** Golden templates identified for the task */
    goldenTemplates?: string[];

    /** Historical performance logs */
    historicalPerformance?: any[];

    /** Past lessons/regrets identified */
    lessons?: any[];

    /** Conversation history for context-aware routing */
    history?: any[];

    /** Optional abort signal */
    signal?: AbortSignal;

    /** Additional metadata */
    metadata?: Record<string, any>;
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
