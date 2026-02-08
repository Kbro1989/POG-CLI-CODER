import type { NeuralLimb, Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { ToolingSpine, type LimbTool } from '../../core/ToolingSpine.js';
import type { ModelExecutor } from '../../core/ModelExecutor.js';
import pino from 'pino';

/**
 * BaseLimb - The standardized substrate for all Sovereign AI Limbs.
 * 
 * Provides automated tool registration, routing, and high-fidelity logging.
 */
export abstract class BaseLimb implements NeuralLimb {
    abstract id: string;
    abstract type: 'creative' | 'analytical' | 'maintenance' | 'memory' | 'cloud';

    // Strategic Affinity
    public preferredHexagrams: string[] = []; // e.g., '111111' (Creative)
    public avoidHexagrams: string[] = [];     // e.g., '010111' (Conflict)

    protected readonly spine: ToolingSpine = new ToolingSpine();
    protected readonly logger: pino.Logger;

    constructor(
        protected readonly config: VibeConfig,
        protected readonly executor?: ModelExecutor
    ) {
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
     * Extracts the raw user intent from a potentially system-wrapped prompt.
     */
    protected getUserIntent(intent: Intent): string {
        const p = intent.prompt;
        const intentMarker = '### CURRENT USER INTENT';
        if (p.includes(intentMarker)) {
            const parts = p.split(intentMarker);
            const content = parts[1];
            if (content) {
                const subParts = content.split('### EXECUTION DIRECTIVE');
                const userPart = subParts[0];
                if (userPart) return userPart.trim();
            }
        }
        return p.trim();
    }

    /**
     * Default canHandle implementation using Ternary Decision logic.
     * Returns: -1 (skip), 0 (maybe), +1 (optimal match)
     */
    async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = this.getUserIntent(intent).toLowerCase();

        // +1: Direct limb ID match = optimal
        if (p.includes(this.id.toLowerCase())) return 1;

        // Count capability matches
        const matches = this.spine.getCapabilities()
            .filter(cap => p.includes(cap.toLowerCase())).length;

        if (matches >= 2) return 1;   // Strong match = escalate
        if (matches === 1) return 0;  // Partial match = balanced
        return -1;                     // No match = de-escalate
    }


    /**
     * Default execute implementation: attempts a Cognitive Response if no tool is matched.
     * This acts as a "Sovereign Chat" fallback within specialized limbs.
     */
    async execute(intent: Intent): Promise<Result<Execution>> {
        if (this.executor) {
            this.logger.info('Direct execution triggered - invoking Cognitive Response fallback');
            const prompt = `You are a specialized limb of POG-CODER-VIBE.
ID: ${this.id}
TYPE: ${this.type}
CAPABILITIES: ${this.capabilities.join(', ')}

The user has triggered this limb with an intent that didn't map to a specific formal tool call.
Use your specialized context to provide a brilliant, straight-up response or guidance.

User Intent: ${this.getUserIntent(intent)}`;

            const response = await this.executor.callModel('gemini:gemini-2.0-flash', prompt);
            if (response.ok) {
                return {
                    ok: true,
                    value: {
                        output: `[Sovereign Cognitive Response - ${this.id}]\n${response.value.response}`,
                        data: { source: this.id, cognitive: true }
                    }
                };
            }
        }

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
     * Get detailed diagnostic/contextual status of the limb.
     */
    public getStatus(): Record<string, any> {
        return {
            id: this.id,
            type: this.type,
            capabilities: this.capabilities,
            toolCount: this.spine.getGeminiDeclarations().length,
            tools: this.spine.getGeminiDeclarations().map(t => ({
                name: t.name,
                description: t.description
            }))
        };
    }

    /**
     * Assigns a ModelExecutor for cognitive fallbacks.
     */
    public setExecutor(executor: ModelExecutor): void {
        (this as any).executor = executor;
    }

    /**
     * Helper to register tools locally in the derived constructor.
     */
    protected registerTools(tools: LimbTool[]): void {
        this.spine.registerTools(tools);
    }
}
