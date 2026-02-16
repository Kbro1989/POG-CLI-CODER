import { CircuitBreaker, PROVIDER_KEY } from './CircuitBreaker.js';
import type { LimbTool } from './models.js';

/**
 * AIToolSpine - Cognitive Tools (Embeddings, Vision, AI-Gen)
 * GATED BY CIRCUIT BREAKER & OFFLINE STATUS.
 */
export class AIToolSpine {
    private readonly tools: Map<string, LimbTool> = new Map();
    private readonly circuitBreaker: CircuitBreaker;

    constructor(circuitBreaker: CircuitBreaker) {
        this.circuitBreaker = circuitBreaker;
    }

    public register(tool: LimbTool): void {
        this.tools.set(tool.name, tool);
    }

    public get(name: string): LimbTool | undefined {
        return this.tools.get(name);
    }

    public getCapabilities(): string[] {
        return Array.from(this.tools.keys());
    }

    public getTools(): LimbTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Checks if a cognitive tool can be executed given the current circuit status.
     * Note: If circuit is OPEN, these tools should failover to Ghost/Ollama Swarm.
     */
    public canExecute(name: string): boolean {
        if (!this.tools.has(name)) return false;
        return !this.circuitBreaker.isOpen(PROVIDER_KEY);
    }
}
