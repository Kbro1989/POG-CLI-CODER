/**
 * @license
 * POG-CODER-VIBE
 * Fallback Routing Strategy
 * Production-ready fallback using actual model data from RoutingContext
 */

import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import type { Logger } from 'pino';
import pino from 'pino';

/**
 * A strategy that handles model failures by routing to an available fallback.
 * Uses actual model names from RoutingContext.availableModels, not abstract tiers.
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

    async route(context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();

        // No fallback needed if no models have failed
        if (this.failedModels.size === 0) {
            return null;
        }

        // Get available models that haven't failed
        const available = (context.availableModels || []).filter(
            m => m.health?.isAvailable && !this.failedModels.has(m.name)
        );

        if (available.length === 0) {
            this.logger.error('No available models for fallback');
            return null; // Let next strategy handle
        }

        // Sort by priority (highest first) and select best fallback
        const sorted = [...available].sort((a, b) => b.priority - a.priority);
        const fallback = sorted[0];

        this.logger.info({
            failedModels: Array.from(this.failedModels),
            selectedFallback: fallback.name
        }, 'Fallback model selected');

        return {
            model: fallback.name,
            metadata: {
                source: 'fallback',
                latencyMs: Math.round(performance.now() - startTime),
                reasoning: `Falling back to ${fallback.name} (priority: ${fallback.priority}) due to failed models: ${Array.from(this.failedModels).join(', ')}`,
            },
        };
    }
}

