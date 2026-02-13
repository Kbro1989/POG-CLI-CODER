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
  private readonly logger: Logger;
  private readonly failedModels: Set<string> = new Set();

  constructor() {
    this.logger = pino({ name: 'FallbackStrategy' });
  }

  /**
   * Track a model failure for fallback consideration.
   */
  public markModelFailed(model: string): void {
    this.failedModels.add(model);
    this.logger.warn({ model, failureCount: this.failedModels.size }, 'Model marked as failed in fallback registry');
  }

  /**
   * Clear failure status for a model (e.g., after successful recovery).
   */
  public clearModelFailure(model: string): void {
    if (this.failedModels.has(model)) {
      this.failedModels.delete(model);
      this.logger.info({ model }, 'Model failure state cleared successfully');
    }
  }

  async route(context: RoutingContext): Promise<RoutingDecision | null> {
    const startTime = performance.now();

    // No fallback needed if no models have failed or no context provided
    if (this.failedModels.size === 0 || !context.availableModels) {
      return null;
    }

    // Get available models that haven't failed and are healthy
    const healthyAvailable = context.availableModels.filter(
      m => m.health?.isAvailable && !this.failedModels.has(m.name)
    );

    if (healthyAvailable.length === 0) {
      this.logger.error({
        failedCount: this.failedModels.size,
        failedList: Array.from(this.failedModels)
      }, 'Critical: No healthy models available for fallback routing');
      return null;
    }

    // Sort by priority (highest first) and select best fallback
    const sorted = [...healthyAvailable].sort((a, b) => b.priority - a.priority);
    const fallback = sorted[0];

    const latency = Math.round(performance.now() - startTime);
    this.logger.info({
      failedModels: Array.from(this.failedModels),
      selectedFallback: fallback.name,
      latencyMs: latency
    }, 'Fallback model successfully selected');

    return {
      model: fallback.name,
      metadata: {
        source: 'fallback',
        latencyMs: latency,
        reasoning: `Falling back to ${fallback.name} (priority: ${fallback.priority}) because [${Array.from(this.failedModels).join(', ')}] are currently offline or failed.`,
      },
    };
  }
}
