/**
 * NeuralLimb Interface - The contract for all specialized limbs
 */
import { Result, Intent, Execution, TernaryDecision } from '../../core/models.js';
export type { Result, Intent, Execution, TernaryDecision };

export interface NeuralLimb {
    id: string;
    type: 'creative' | 'analytical' | 'maintenance' | 'memory' | 'cloud' | 'action' | 'experimental' | 'sensory' | 'metabolic' | 'psychic' | 'metaphysical' | 'system';
    capabilities: string[];

    /**
     * Strategic affinity for Hexagram states
     */
    preferredHexagrams?: string[];
    avoidHexagrams?: string[];

    /**
     * Check if this limb can handle the given intent.
     * Returns TernaryDecision: -1 (skip), 0 (maybe), +1 (optimal)
     */
    canHandle(intent: Intent): Promise<TernaryDecision>;

    /**
     * Execute the limb's primary function (High-level orchestration)
     */
    execute(intent: Intent): Promise<Result<Execution>>;

    /**
     * Optional: Return formal tool declarations for the Supervisor Loop
     */
    getTools?(): any[];

    /**
     * Optional: Handle a formal tool call from the model
     */
    handleToolCall?(name: string, args: any): Promise<Result<any>>;

    /**
     * Optional: Get detailed diagnostic/contextual status of the limb
     */
    getStatus?(): Record<string, any>;

    /**
     * Optional: Assigns a ModelExecutor for cognitive fallbacks
     */
    setExecutor?(executor: any): void;
}

