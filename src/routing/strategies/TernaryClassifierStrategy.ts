import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import type { Logger } from 'pino';
import pino from 'pino';

/**
 * A routing strategy that classifies requests into ternary tiers based on task weights.
 * Returning specific models mapped from tiers.
 */
export class TernaryClassifierStrategy implements RoutingStrategy {
    readonly name = 'ternary-classifier';
    private readonly logger: Logger;

    constructor() {
        this.logger = pino({ name: 'TernaryClassifierStrategy' });
    }

    async route(context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();
        const { prompt, weightedTasks = {}, availableModels = [] } = context;

        try {
            const classification = this.classifyPrompt(prompt, weightedTasks);
            const targetModel = this.selectModelFromTier(classification.tier, availableModels);

            if (!targetModel) return null;

            const latencyMs = Math.round(performance.now() - startTime);
            return {
                model: targetModel,
                metadata: {
                    source: 'ternary-classifier',
                    latencyMs,
                    reasoning: `${classification.reasoning} -> Selected: ${targetModel}`,
                },
            };
        } catch (error) {
            this.logger.warn({ error }, 'Classification failed');
            return null;
        }
    }

    private selectModelFromTier(tier: string, available: any[]): string | null {
        const tierFilter = (m: any) => {
            if (tier === 'reasoning') return m.name.includes('Kimi') || m.id.includes('kimi');
            if (tier === 'cloud') return m.type === 'cloud-free' || m.type === 'cloudflare';
            if (tier === 'edge') return m.name.includes('llama-3.1-8b') || m.name.includes('yi-coder') || m.type === 'cloudflare';
            return m.type === 'local';
        };

        const candidates = available
            .filter(m => m.health?.isAvailable && (m.health?.circuitLevel !== 'Yin'))
            .filter(tierFilter);

        return [...candidates].sort((a, b) => b.priority - a.priority)[0]?.name || null;
    }

    private classifyPrompt(prompt: string, weights: Record<string, number>): {
        tier: string;
        reasoning: string;
    } {
        const lowerPrompt = prompt.toLowerCase();

        // 1. Esoteric / High-Intel Reasoning (Ternary +1: Reasoning)
        if ((weights['esoteric'] || 0) > 0.6 || lowerPrompt.includes('esoteric') || lowerPrompt.includes('kimi')) {
            return { tier: 'reasoning', reasoning: 'Esoteric/High-intel reasoning task detected' };
        }

        // 2. Sensory/Utility detection (Ternary 0: Edge)
        if (/\b(screenshot|image|ocr|translate|vision|analyze)\b/.test(lowerPrompt)) {
            return { tier: 'edge', reasoning: 'Sensory intent detected' };
        }

        // 3. High-Complexity detection (Standard +1: Cloud)
        if ((weights['architecture'] || 0) > 0.4 || (weights['api-orchestration'] || 0) > 0.5) {
            return { tier: 'cloud', reasoning: 'High complexity architecture/orchestration' };
        }

        // 4. Low-Complexity detection (Ternary -1: Local)
        if (/\b(list|read|view|find)\b/.test(lowerPrompt) && (weights['generate'] || 0) < 0.3) {
            return { tier: 'local', reasoning: 'Low-complexity informational task' };
        }

        // 5. Generative weights
        const genWeight = weights['generate'] || 0;
        if (genWeight > 0.8) return { tier: 'cloud', reasoning: 'High generative weight' };
        if (genWeight > 0.4) return { tier: 'edge', reasoning: 'Moderate generative weight' };

        return { tier: 'local', reasoning: 'Defaulting to local efficiency' };
    }
}
