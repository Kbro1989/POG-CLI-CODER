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
    private readonly logger: Logger;
    private readonly decisionTree: TernaryNode;

    constructor() {
        this.logger = pino({ name: 'AnalyticalStrategy' });
        this.decisionTree = this.buildDecisionTree();
    }

    async route(context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();
        const { prompt, weightedTasks = {}, complexity = 'Yin' } = context;

        this.logger.debug({ prompt: prompt.substring(0, 50) }, 'Processing analytical route');

        // Bypass for simple intents (Allow TernaryClassifier or Default to handle)
        if (complexity === 'Yin' && (weightedTasks[TT.Architecture] || 0) < 0.3 && (weightedTasks[TT.Generate] || 0) < 0.3) {
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

    private performSimulations(context: RoutingContext): string[] {
        const { complexity = 'YinYang', weightedTasks = {} } = context;
        const biases: Ternary[] = ['Yin', 'YinYang', 'Yang'];

        return biases.map(bias => {
            // Simulation is a weighted blend: if bias is Yang and complexity is Yin, return YinYang
            const resolvedComplexity = this.resolveComplexity(complexity);
            let blended: Ternary = resolvedComplexity;

            if (bias === 'Yang' && resolvedComplexity === 'Yin') blended = 'YinYang';
            if (bias === 'Yin' && resolvedComplexity === 'Yang') blended = 'YinYang';
            if (bias === 'Yang' && resolvedComplexity === 'Yang') blended = 'Yang';
            if (bias === 'Yin' && resolvedComplexity === 'Yin') blended = 'Yin';

            return this.traverseTree(this.decisionTree, blended, weightedTasks);
        });
    }

    private resolveComplexity(complexity: import('../../core/models.js').CognitiveChoice): Ternary {
        if (typeof complexity === 'string') return complexity as Ternary;
        // Map Yao/Binary states to Ternary strings
        // 0 (OldYang/Yin), 1 (YoungYin/Yang), 2 (YoungYang), 3 (OldYin)
        // This is a simplification; ideally use a central translator
        if (complexity === 1 || complexity === 3) return 'Yin'; // YoungYin, OldYin
        if (complexity === 2 || complexity === 0) return 'Yang'; // YoungYang, OldYang
        return 'YinYang'; // Transition/Unknown
    }

    private synthesizeDecision(simulations: string[], context: RoutingContext): string {
        const { complexity = 'Yin', availableModels = [] } = context;

        // Pick tier based on simulations and complexity
        let selectedTier: 'cloud' | 'edge' | 'local' = 'local';
        if (complexity === 'Yang') {
            selectedTier = simulations.includes('cloud') ? 'cloud' : 'edge';
        } else if (simulations.includes('cloud')) {
            selectedTier = 'cloud';
        } else if (simulations.includes('edge')) {
            selectedTier = 'edge';
        }

        return this.selectModelFromTier(selectedTier, availableModels, context) || 'gemini-2.0-flash';
    }

    private selectModelFromTier(tier: string, available: any[], context: RoutingContext): string | null {
        // Map abstract tiers to concrete categories
        const tierFilter = (m: any) => {
            if (tier === 'cloud') return m.type === 'cloud-free' || m.type === 'cloudflare';
            if (tier === 'edge') return m.name.includes('llama-3.1-8b') || m.name.includes('yi-coder') || m.type === 'cloudflare';
            if (tier === 'local') {
                const weightedTasks = context.weightedTasks || {};
                const isMonitor = (weightedTasks[TT.Monitor] ?? 0) > 0.4 || (weightedTasks[TT.Intervention] ?? 0) > 0.4;
                if (isMonitor) return m.type === 'local' && (m.name.includes('tinyllama') || m.name.includes('1.5b'));
                return m.type === 'local';
            }
            return false;
        };

        const candidates = available
            .filter(m => m.health?.isAvailable && (m.health?.circuitLevel !== 'Yin'))
            .filter(tierFilter);

        if (candidates.length === 0) return null;

        // Return highest priority model in the tier
        return [...candidates].sort((a, b) => b.priority - a.priority)[0]?.name || null;
    }

    private traverseTree(node: TernaryNode, complexity: Ternary, weights: Record<string, number>): string {
        if (node.kind === 'leaf') return node.modelName;

        const result = node.condition({ complexity, weightedTasks: weights } as any);
        const nextNode = result === 'Yin' ? node.left : result === 'YinYang' ? node.center : node.right;

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
                condition: (ctx) => ctx.weightedTasks[TT.Syntax] > 0.7 ? 'Yin' : 'YinYang',
                left: leaf('local'),
                center: leaf('edge'),
                right: leaf('cloud')
            },

            center: {
                kind: 'branch',
                description: 'Moderate Complexity (Cloudflare Intermediate Tier)',
                condition: (_ctx) => 'YinYang',
                left: leaf('local'),
                center: leaf('edge'),
                right: leaf('cloud')
            },

            right: {
                kind: 'branch',
                description: 'High Complexity / Architecture (Pro Tier)',
                condition: (ctx) => (ctx.weightedTasks[TT.Architecture] > 0.4 || ctx.weightedTasks[TT.Generate] > 0.4) ? 'Yang' : 'YinYang',
                left: leaf('edge'),
                center: leaf('cloud'),
                right: leaf('cloud')
            }
        };
    }
}
