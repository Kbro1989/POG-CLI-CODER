import { EventEmitter } from 'events';
import type { Result, LimbTool } from './models.js';
import { YaoState } from './models.js';
import { ToolSpine } from './ToolSpine.js';
import { AIToolSpine } from './AIToolSpine.js';
import { CircuitBreaker } from './CircuitBreaker.js';

export { LimbTool };

export interface PulseEvent {
    state: YaoState;
    detail: string;
    source: string;
}

/**
 * ToolingSpine - Centralizes tool registration and routing for Limbs.
 * Delegates to ToolSpine (Deterministic) or AIToolSpine (Cognitive).
 */
export class ToolingSpine extends EventEmitter {
    private readonly toolSpine = new ToolSpine();
    private readonly aiToolSpine: AIToolSpine;

    constructor(circuitBreaker?: CircuitBreaker) {
        super();
        this.aiToolSpine = new AIToolSpine(circuitBreaker || new CircuitBreaker());
    }

    /**
     * Emits a ternary pulse for Hexagram Line 2.
     */
    emitPulse(state: YaoState, detail: string, source: string): void {
        this.emit('pulse', { state, detail, source } as PulseEvent);
    }

    /**
     * Register multiple tools at once.
     * Tools with AI-heavy descriptions or specific markers are routed to AIToolSpine.
     */
    registerTools(tools: LimbTool[], type: 'basic' | 'cognitive' = 'basic'): void {
        for (const tool of tools) {
            if (type === 'cognitive') {
                this.aiToolSpine.register(tool);
            } else {
                this.toolSpine.register(tool);
            }
        }
    }

    /**
     * Register a specialized spine's tools.
     */
    registerSpine(tools: LimbTool[]): void {
        this.registerTools(tools, 'basic');
    }

    /**
     * Returns Google Gemini compatible tool declarations.
     */
    getGeminiDeclarations(): Array<{ functionDeclarations: Array<Record<string, unknown>> }> {
        const allTools = [...this.toolSpine.getTools(), ...this.aiToolSpine.getTools()];
        const declarations = allTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as Record<string, unknown>
        }));

        return [{ functionDeclarations: declarations }];
    }

    /**
     * Routes a tool call to the registered handler with validation.
     */
    async handleCall<T = unknown>(name: string, args: Record<string, unknown>): Promise<Result<T>> {
        const tool = this.toolSpine.get(name) || this.aiToolSpine.get(name);

        if (!tool) {
            return { ok: false, error: new Error(`Tool Spine: Unknown tool '${name}'`) };
        }

        // Circuit Gate for AI tools
        if (this.aiToolSpine.get(name) && !this.aiToolSpine.canExecute(name)) {
            this.emitPulse(YaoState.OldYin, `Circuit Open: ${name} yielding to swarm`, 'AIToolSpine');
            return { ok: false, error: new Error(`Circuit OPEN for tool '${name}' - Failover to Swarm required`) };
        }

        let parsedArgs: Record<string, unknown> = args;

        // Perform Zod validation if schema is present
        if (tool.schema) {
            const validationResult = tool.schema.safeParse(args);
            if (!validationResult.success) {
                return {
                    ok: false,
                    error: new Error(`Validation Error [${name}]: ${JSON.stringify(validationResult.error.format())}`)
                };
            }
            parsedArgs = validationResult.data as Record<string, unknown>;
        }

        try {
            const result = await tool.handler(parsedArgs) as Result<T>;
            if (result.ok) {
                this.emitPulse(YaoState.YoungYang, `Execution Success: ${name}`, 'ToolingSpine');
            } else {
                this.emitPulse(YaoState.YoungYin, `Execution Error: ${name}`, 'ToolingSpine');
            }
            return result;
        } catch (error) {
            this.emitPulse(YaoState.OldYin, `Fatal Error: ${name}`, 'ToolingSpine');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Returns list of capability names.
     */
    getCapabilities(): string[] {
        return [...this.toolSpine.getCapabilities(), ...this.aiToolSpine.getCapabilities()];
    }

    /**
     * Status for dashboard reporting.
     */
    getSpineStatus(): { basic: number; cognitive: number } {
        return {
            basic: this.toolSpine.getCapabilities().length,
            cognitive: this.aiToolSpine.getCapabilities().length
        };
    }
}


