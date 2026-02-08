import type { RoutingContext, RoutingDecision, TerminalStrategy } from '../types.js';

/**
 * A terminal strategy that always returns a specific local model.
 */
export class DefaultStrategy implements TerminalStrategy {
    readonly name = 'default';

    async route(context: RoutingContext): Promise<RoutingDecision> {
        const startTime = performance.now();
        const { availableModels = [] } = context;

        // Try to find qwen2.5-coder:7b in available models
        const defaultModel = availableModels.find(m => m.name.includes('qwen2.5-coder:7b'))?.name || 'qwen2.5-coder:7b';

        return {
            model: defaultModel,
            metadata: {
                source: 'default',
                latencyMs: Math.round(performance.now() - startTime),
                reasoning: 'Using default local model as terminal fallback',
            },
        };
    }
}
