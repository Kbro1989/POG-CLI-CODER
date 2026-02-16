import { EventEmitter } from 'events';
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
export abstract class BaseLimb extends EventEmitter implements NeuralLimb {
    abstract id: string;
    abstract type: 'creative' | 'analytical' | 'maintenance' | 'memory' | 'cloud' | 'action' | 'experimental' | 'sensory' | 'metabolic' | 'psychic' | 'metaphysical' | 'system';

    // Strategic Affinity
    public preferredHexagrams: string[] = []; // e.g., '111111' (Creative)
    public avoidHexagrams: string[] = [];     // e.g., '010111' (Conflict)

    public readonly spine: ToolingSpine = new ToolingSpine();
    protected readonly logger: pino.Logger;

    constructor(
        protected readonly config: VibeConfig,
        protected readonly executor?: ModelExecutor
    ) {
        super();
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
     * Default canHandle implementation using Semantic Sovereignty logic.
     * Returns: 'Yin' (skip), 'YinYang' (maybe), 'Yang' (optimal match)
     */
    async canHandle(intent: Intent): Promise<TernaryDecision> {
        // Gating Check: If service is explicitly disabled in config, it remains inert.
        const normalizedServices = (this.config.enabledServices || []).map(s => s.toLowerCase());
        const isEnabled = !this.config.enabledServices || normalizedServices.includes(this.id.toLowerCase());

        if (!isEnabled) {
            return 'Yin';
        }

        const p = this.getUserIntent(intent).toLowerCase();

        // 'Yang': Direct limb ID match = optimal
        if (p.includes(this.id.toLowerCase())) return 'Yang';

        // Count capability matches
        const matches = this.spine.getCapabilities()
            .filter(cap => p.includes(cap.toLowerCase())).length;

        if (matches >= 2) return 'Yang';   // Strong match = escalate
        if (matches === 1) return 'YinYang'; // Partial match = balanced

        return 'YinYang'; // Default to YinYang if enabled but no specific match, allowing specialized limbs to decide
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
    getTools(): import('./NeuralLimb.js').ToolDeclaration[] {
        return this.spine.getGeminiDeclarations() as import('./NeuralLimb.js').ToolDeclaration[];
    }

    /**
     * Standardized tool call handling via the Spine.
     */
    async handleToolCall(name: string, args: Record<string, unknown>): Promise<Result<Execution>> {
        this.logger.debug({ tool: name, args }, 'Routing tool call through Spine');
        const res = await this.spine.handleCall(name, args);
        if (!res.ok) { // Changed 'result' to 'res'
            const error = (res as { ok: false; error: Error }).error; // Changed 'result' to 'res'
            this.logger.warn({ error }, 'Inline prediction failed'); // Added this line
            return { ok: false, error };
        }

        const val = res.value;
        // High-fidelity mapping of spine results to Execution substrate
        if (val && typeof val === 'object' && 'output' in val) {
            return { ok: true, value: val as Execution };
        }
        return {
            ok: true,
            value: {
                output: typeof val === 'string' ? val : JSON.stringify(val, null, 2),
                data: val
            }
        };
    }

    /**
     * Get detailed diagnostic/contextual status of the limb.
     */
    public getStatus(): Record<string, unknown> {
        const tools = this.getTools();
        const flatTools = tools.flatMap(t => t.functionDeclarations);

        return {
            id: this.id,
            type: this.type,
            capabilities: this.capabilities,
            preferredHexagrams: this.preferredHexagrams,
            avoidHexagrams: this.avoidHexagrams,
            toolCount: flatTools.length,
            tools: flatTools.map(t => ({
                name: t.name,
                description: t.description
            }))
        };
    }

    /**
     * Assigns a ModelExecutor for cognitive fallbacks.
     */
    public setExecutor(executor: ModelExecutor): void {
        (this as unknown as { executor?: ModelExecutor }).executor = executor;
    }

    /**
     * Helper to register tools locally in the derived constructor.
     */
    protected registerTools(tools: LimbTool[]): void {
        this.spine.registerTools(tools);
    }

    /**
     * Helper to register a specialized spine's tools.
     */
    protected registerSpine(tools: LimbTool[]): void {
        this.spine.registerSpine(tools);
    }

    /**
     * Emits a "Memory Pulse" for Hexagram Line 2.
     * All limbs utilize this to broadcast service health and activity.
     */
    protected async pinPulse(state: import('../../core/models.js').YaoState, detail: string): Promise<void> {
        this.spine.emitPulse(state, detail, this.id);
        this.logger.info({ state, detail }, 'Limb Pulse Emitted');
    }


    /**
     * Optional: Perform resource cleanup (close DBs, kill processes, etc.)
     */
    public async close(): Promise<void> {
        // Default implementation does nothing
    }
}
