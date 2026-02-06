/**
 * NeuralLimb Interface - The contract for all specialized limbs
 */
import { Result, Intent, Execution } from '../../core/models.js';
export type { Result, Intent, Execution };

export interface NeuralLimb {
    id: string;
    type: 'creative' | 'analytical' | 'maintenance' | 'memory' | 'cloud';
    capabilities: string[];

    /**
     * Check if this limb can handle the given intent
     */
    canHandle(intent: Intent): Promise<boolean>;

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
}

