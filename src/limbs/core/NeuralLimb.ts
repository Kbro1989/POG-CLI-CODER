/**
 * NeuralLimb Interface - The contract for all specialized limbs
 */

// Actually, looking at the file, these are re-exported or used in types. 
// The error said 'Result', 'Intent', 'Execution', 'TernaryDecision' are unused? 
// But they are exported on line 6: export type { Result, Intent, Execution, TernaryDecision };
// If they are only used in export type, they might need to be imported as types or the linter is being strict about 'import { ... }' vs 'import type { ... }'.
// Let's try importing them as type to be safe, or if they are truly unused (maybe they are defined in models.ts and we are re-exporting them?).
// Validating line 4: import { Result, Intent, Execution, TernaryDecision } from '../../core/models.js';
// If I change to import type it should satisfy "unused value" errors if they are only used as types.
import type { ModelExecutor } from '../../core/ModelExecutor.js';
import type { ToolingSpine } from '../../core/ToolingSpine.js';
import type { Result, Intent, Execution, TernaryDecision } from '../../core/models.js';

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
     * Returns YaoState: OldYang (optimal), YoungYin (skip), YoungYang (maybe)
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

