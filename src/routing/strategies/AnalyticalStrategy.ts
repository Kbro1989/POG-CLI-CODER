import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import type { Ternary, TernaryNode } from '../../core/models.js';
import { TaskType as TT } from '../../core/models.js';
import type { Logger } from 'pino';
import pino from 'pino';

/**
 * AnalyticalStrategy - Sovereign Cognitive Processor
 * 
 * Performs 3 parallel "thought processes" (Simulations) biased by lessons and resource health.
 * Strictly adheres to ternary decision-making (-1/0/1).
 */
export class AnalyticalStrategy implements RoutingStrategy {
    readonly name = 'analytical';
    private logger: Logger;
    private decisionTree: TernaryNode;

    constructor() {
        this.logger = pino({ name: 'AnalyticalStrategy' });
        this.decisionTree = this.buildDecisionTree();
    }

    async route(context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();
        const { prompt, weightedTasks = {}, complexity = 0 } = context;

        this.logger.debug({ prompt: prompt.substring(0, 50) }, 'Processing analytical route');

        // Bypass for simple intents (Allow TernaryClassifier or Default to handle)
        if (complexity < 1 && (weightedTasks['architecture'] || 0) < 0.3 && (weightedTasks['generate'] || 0) < 0.3) {
            return null;
        }

        // THINK: Parallel Simulations (Defensive, Balanced, Exploratory)
        const simulations = this.performSimulations(context);

        // Synthesis: Best Route Selection (Maps tiers to concrete models)
        const bestModel = this.synthesizeDecision(simulations, context);

        const latencyMs = Math.round(performance.now() - startTime);
        this.logger.info({ bestModel, latencyMs }, 'Cognitive synthesis complete');

        return {
            model: bestModel,
            metadata: {
                source: 'analytical',
                latencyMs,
                reasoning: `Synthesis of ${simulations.length} simulations biased by complexity [${complexity}] and cognitive regrets.`,
            },
        };
    }

    private performSimulations(ctx: RoutingContext): string[] {
        const { complexity = 0, weightedTasks = {} } = ctx;
        const biases: Ternary[] = [-1, 0, 1];

        return biases.map(bias => {
            const blendedComplexity = Math.max(-1, Math.min(1, bias + complexity)) as Ternary;
            return this.traverseTree(this.decisionTree, blendedComplexity, weightedTasks);
        });
    }

    private synthesizeDecision(simulations: string[], ctx: RoutingContext): string {
        const { complexity = 0, availableModels = [] } = ctx;

        // Pick tier based on simulations and complexity
        let selectedTier: 'cloud' | 'edge' | 'local' = 'local';
        if (complexity === 1) {
            selectedTier = simulations.includes('cloud') ? 'cloud' : 'edge';
        } else if (simulations.includes('cloud')) {
            selectedTier = 'cloud';
        } else if (simulations.includes('edge')) {
            selectedTier = 'edge';
        }

        return this.selectModelFromTier(selectedTier, availableModels) || 'gemini-2.0-flash';
    }

    private selectModelFromTier(tier: string, available: any[]): string | null {
        // Map abstract tiers to concrete categories
        const tierFilter = (m: any) => {
            if (tier === 'cloud') return m.type === 'cloud-free' || m.type === 'cloudflare';
            if (tier === 'edge') return m.name.includes('llama-3.1-8b') || m.name.includes('yi-coder') || m.type === 'cloudflare';
            return m.type === 'local';
        };

        const candidates = available
            .filter(m => m.health?.isAvailable && (m.health?.circuitLevel ?? 0) >= 0)
            .filter(tierFilter);

        if (candidates.length === 0) return null;

        // Return highest priority model in the tier
        return [...candidates].sort((a, b) => b.priority - a.priority)[0]?.name || null;
    }

    private traverseTree(node: TernaryNode, complexity: Ternary, weights: Record<string, number>): string {
        if (node.kind === 'leaf') return node.modelName;

        const result = node.condition({ complexity, weightedTasks: weights } as any);
        const nextNode = result < 0 ? node.left : result === 0 ? node.center : node.right;

        return this.traverseTree(nextNode, complexity, weights);
    }

    private buildDecisionTree(): TernaryNode {
        const leaf = (modelName: string): TernaryNode => ({ kind: 'leaf', modelName });

        return {
            kind: 'branch',
            description: 'Assess initial complexity state',
            condition: (ctx) => ctx.complexity as Ternary,

            left: {
                kind: 'branch',
                description: 'Optimize for speed/syntax (Local Preferred)',
                condition: (ctx) => ctx.weightedTasks[TT.Syntax] > 0.7 ? -1 : 0,
                left: leaf('local'),
                center: leaf('edge'),
                right: leaf('cloud')
            },

            center: {
                kind: 'branch',
                description: 'Moderate Complexity (Cloudflare Intermediate Tier)',
                condition: (_ctx) => 0 as Ternary,
                left: leaf('local'),
                center: leaf('edge'),
                right: leaf('cloud')
            },

            right: {
                kind: 'branch',
                description: 'High Complexity / Architecture (Pro Tier)',
                condition: (ctx) => (ctx.weightedTasks[TT.Architecture] > 0.4 || ctx.weightedTasks[TT.Generate] > 0.4) ? 1 : 0,
                left: leaf('edge'),
                center: leaf('cloud'),
                right: leaf('cloud')
            }
        };
    }
}
