/**
 * NeuralLimb Interface - The contract for all specialized limbs
 */
import { Result, Intent, Execution, TernaryDecision } from '../../core/models.js';
import type { ModelExecutor } from '../../core/ModelExecutor.js';
import type { ToolingSpine } from '../../core/ToolingSpine.js';

export type { Result, Intent, Execution, TernaryDecision };

export interface ToolDeclaration {
    functionDeclarations: Array<{
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    }>;
}

export interface NeuralLimb {
    id: string;
    type: 'creative' | 'analytical' | 'maintenance' | 'memory' | 'cloud' | 'action' | 'experimental' | 'sensory' | 'metabolic' | 'psychic' | 'metaphysical' | 'system';
    capabilities: string[];
    readonly spine?: ToolingSpine;

    /**
     * Strategic affinity for Hexagram states
     */
    preferredHexagrams?: string[];
    avoidHexagrams?: string[];

    /**
     * Check if this limb can handle the given intent.
     * Returns CognitiveChoice: 'Yang' (optimal), 'Yin' (skip), 'YinYang' (maybe)
     */
    canHandle(intent: Intent): Promise<TernaryDecision>;

    /**
     * Execute the limb's primary function (High-level orchestration)
     */
    execute(intent: Intent): Promise<Result<Execution>>;

    /**
     * Optional: Return formal tool declarations for the Supervisor Loop
     */
    getTools?(): ToolDeclaration[];

    /**
     * Optional: Handle a formal tool call from the model
     */
    handleToolCall?(name: string, args: Record<string, unknown>): Promise<Result<Execution>>;

    /**
     * Optional: Get detailed diagnostic/contextual status of the limb
     */
    getStatus?(): Record<string, unknown>;

    /**
     * Optional: Assigns a ModelExecutor for cognitive fallbacks
     */
    setExecutor?(executor: ModelExecutor): void;

    /**
     * Optional: Perform resource cleanup (close DBs, kill processes, etc.)
     */
    close?(): Promise<void>;
}

