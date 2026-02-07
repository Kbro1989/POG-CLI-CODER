/**
 * @license
 * POG-CODER-VIBE
 * Fallback Routing Strategy
 * Simplified production-ready fallback without VibeConfig dependencies
 */

import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import type { Logger } from 'pino';
import pino from 'pino';

/**
 * A strategy that handles model failures by routing to an available fallback tier.
 * Returns null if no fallback is needed (i.e., no active failures).
 */
export class FallbackStrategy implements RoutingStrategy {
    readonly name = 'fallback';
    private logger: Logger;
    private failedModels: Set<string> = new Set();

    constructor() {
        this.logger = pino({ name: 'FallbackStrategy' });
    }

    /**
     * Track a model failure for fallback consideration.
     */
    public markModelFailed(model: string): void {
        this.failedModels.add(model);
        this.logger.warn({ model }, 'Model marked as failed');
    }

    /**
     * Clear failure status for a model (e.g., after successful recovery).
     */
    public clearModelFailure(model: string): void {
        this.failedModels.delete(model);
        this.logger.info({ model }, 'Model failure cleared');
    }

    async route(_context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();

        // Check if there are any failed models that need fallback
        if (this.failedModels.size === 0) {
            return null; // No fallback needed
        }

        // Determine which models are currently available
        const availableModels = this.getAvailableModels();

        if (availableModels.length === 0) {
            this.logger.error('No available models for fallback');
            return null; // Let next strategy handle
        }

        // Select the best available model based on priority
        const fallbackModel = this.selectBestFallback(availableModels);

        return {
            model: fallbackModel,
            metadata: {
                source: 'fallback',
                latencyMs: Math.round(performance.now() - startTime),
                reasoning: `Falling back due to failed models: ${Array.from(this.failedModels).join(', ')}`,
            },
        };
    }

    private getAvailableModels(): string[] {
        const available: string[] = [];

        // Check which tiers are not marked as failed
        const allTiers = ['local', 'edge', 'cloud'];
        for (const tier of allTiers) {
            if (!this.failedModels.has(tier)) {
                available.push(tier);
            }
        }

        return available;
    }

    private selectBestFallback(availableModels: string[]): string {
        // Prefer local → edge → cloud for performance and cost
        const priority = ['local', 'edge', 'cloud'];

        for (const tier of priority) {
            if (availableModels.includes(tier)) {
                return tier;
            }
        }

        // Fallback to first available if priority doesn't match, or 'local' if somehow empty
        return availableModels[0] ?? 'local';
    }
}
