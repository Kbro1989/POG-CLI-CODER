import type { NeuralLimb, Intent, Execution } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { ToolingSpine, type LimbTool } from '../../core/ToolingSpine.js';
import pino from 'pino';

/**
 * BaseLimb - The standardized substrate for all Sovereign AI Limbs.
 * 
 * Provides automated tool registration, routing, and high-fidelity logging.
 */
export abstract class BaseLimb implements NeuralLimb {
    abstract id: string;
    abstract type: 'creative' | 'analytical' | 'maintenance' | 'memory' | 'cloud';
    protected readonly spine: ToolingSpine = new ToolingSpine();
    protected readonly logger: pino.Logger;

    constructor(protected readonly config: VibeConfig) {
        this.logger = pino({
            name: this.constructor.name,
            base: { hostname: 'POG-VIBE' }
        });
    }

    /**
     * Common capability listing based on registered tools.
     */
    get capabilities(): string[] {
        return this.spine.getCapabilities();
    }

    /**
     * Default canHandle implementation: checks if any tool name or limb id is in the prompt.
     * Derived classes should override for more sophisticated intent detection.
     */
    async canHandle(intent: Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();
        if (p.includes(this.id.toLowerCase())) return true;

        return this.spine.getCapabilities().some(cap => p.includes(cap.toLowerCase()));
    }

    /**
     * Default execute implementation: returns error as high-level orchestration
     * should typically happen via specific tool calls in the Tooling Spine.
     */
    async execute(_intent: Intent): Promise<Result<Execution>> {
        return {
            ok: false,
            error: new Error(`Limb [${this.id}] requires formal tool calls. Use getTools() to see options.`)
        };
    }

    /**
     * Exposes formal tool declarations to the Supervisor.
     */
    getTools(): any[] {
        return this.spine.getGeminiDeclarations();
    }

    /**
     * Standardized tool call handling via the Spine.
     */
    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        this.logger.debug({ tool: name, args }, 'Routing tool call through Spine');
        return this.spine.handleCall(name, args);
    }

    /**
     * Helper to register tools locally in the derived constructor.
     */
    protected registerTools(tools: LimbTool[]): void {
        this.spine.registerTools(tools);
    }
}
