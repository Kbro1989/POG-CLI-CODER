/**
 * NeuralLimb Interface - The contract for all specialized limbs
 */
import { Result } from '../../core/models.js';

export interface Intent {
    prompt: string;
    files?: string[];
    context?: any;
    tools?: any[];
}

export interface Execution {
    output: string;
    data?: any;
    filesModified?: string[];
    commandsRun?: string[];
}

export interface NeuralLimb {
    id: string;
    type: 'creative' | 'analytical' | 'maintenance' | 'memory';
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

