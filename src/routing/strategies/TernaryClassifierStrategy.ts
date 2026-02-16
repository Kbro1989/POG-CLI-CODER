import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import type { Logger } from 'pino';
import { pino } from 'pino';

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
            const classification = this.classifyPrompt(prompt, weightedTasks, context.hexagram);
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
            if (tier === 'reasoning') return m.name.toLowerCase().includes('sovereign') || m.name.toLowerCase().includes('deepseek');
            if (tier === 'deep') return m.serviceType === 'OLLAMA' && (m.modelId.includes('33b') || m.modelId.includes('14b'));
            if (tier === 'edge') return m.name.includes('llama-3.2') || m.name.includes('yi-coder') || m.name.includes('vibethinker');
            if (tier === 'all') return true;
            return m.serviceType === 'OLLAMA';
        };

        const candidates = available
            .filter(m => m.health?.isAvailable && (m.health?.circuitLevel !== 'Yin'))
            .filter(tierFilter);

        return [...candidates].sort((a, b) => b.priority - a.priority)[0]?.name || null;
    }

    private classifyPrompt(prompt: string, weights: Record<string, number>, hexagram?: import('../../core/HexagramDefinitions.js').HexagramDefinition): {
        tier: string;
        reasoning: string;
    } {
        const lowerPrompt = prompt.toLowerCase();
        let strategyReasoning = '';

        // 0. Hexagram Strategic Override (Sovereign Authority)
        if (hexagram) {
            if (hexagram.strategy === 'EXPAND') {
                // Expansion: Aggressively prefer capable models
                if ((weights['generate'] || 0) > 0.3 || (weights['architecture'] || 0) > 0.1) {
                    return { tier: 'cloud', reasoning: `Hexagram strategy EXPAND boosted capability priority (${hexagram.name})` };
                }
            } else if (hexagram.strategy === 'YIELD') {
                // Yield: Conserve resources, prefer local
                if ((weights['esoteric'] || 0) < 0.8 && !(weights['architecture'] || 0)) {
                    return { tier: 'local', reasoning: `Hexagram strategy YIELD enforce efficiency (${hexagram.name})` };
                }
                strategyReasoning = `(Biased by YIELD: ${hexagram.name}) `;
            }
        }

        // 1. Esoteric / High-Intel Reasoning (Sovereign Master Tier)
        if ((weights['esoteric'] || 0) > 0.6 || lowerPrompt.includes('esoteric') || lowerPrompt.includes('sovereign')) {
            return { tier: 'reasoning', reasoning: strategyReasoning + 'Esoteric/High-intel reasoning task detected' };
        }

        // 2. Sensory/Utility detection (Ternary 0: Edge)
        if (/\b(screenshot|image|ocr|translate|vision|analyze)\b/.test(lowerPrompt)) {
            return { tier: 'edge', reasoning: strategyReasoning + 'Sensory intent detected' };
        }

        // 3. High-Complexity detection (Deep Local Tier)
        if ((weights['architecture'] || 0) > 0.4 || (weights['api-orchestration'] || 0) > 0.5) {
            return { tier: 'deep', reasoning: strategyReasoning + 'High complexity architecture/orchestration' };
        }

        // 4. Low-Complexity detection (Ternary -1: Local)
        if (/\b(list|read|view|find)\b/.test(lowerPrompt) && (weights['generate'] || 0) < 0.3) {
            return { tier: 'local', reasoning: strategyReasoning + 'Low-complexity informational task' };
        }

        // 5. Generative weights
        const genWeight = weights['generate'] || 0;
        if (genWeight > 0.8) return { tier: 'deep', reasoning: strategyReasoning + 'High generative weight' };
        if (genWeight > 0.4) return { tier: 'edge', reasoning: strategyReasoning + 'Moderate generative weight' };

        return { tier: 'local', reasoning: strategyReasoning + 'Defaulting to local efficiency' };
    }
}
