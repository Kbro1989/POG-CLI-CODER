/**
 * @license
 * POG-CODER-VIBE
 * Default Routing Strategy (Terminal Fallback)
 * Simple production-ready terminal strategy
 */

import type { RoutingContext, RoutingDecision, TerminalStrategy } from '../types.js';

/**
 * A terminal strategy that always returns 'local' as the default.
 * This ensures the routing chain always terminates with a valid decision.
 * Prioritizes local Ollama for speed and reliability.
 */
export class DefaultStrategy implements TerminalStrategy {
    readonly name = 'default';

    async route(_context: RoutingContext): Promise<RoutingDecision> {
        const startTime = performance.now();

        return {
            model: 'local',
            metadata: {
                source: 'default',
                latencyMs: Math.round(performance.now() - startTime),
                reasoning: 'Using default local tier as no other strategy matched',
            },
        };
    }
}
