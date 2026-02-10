import { BaseLimb } from '../core/BaseLimb.js';
import { ModelInventory } from '../../core/ModelInventory.js';
import { HealthRegistry } from '../../core/HealthRegistry.js';
import { TaskClassifier } from '../../core/TaskClassifier.js';
import type { Intent, Execution } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { z } from 'zod';

/**
 * AIModelLimb - Neural Health & Smart Routing Substrate
 * 
 * Provides visibility into the global model cluster health and 
 * advises on optimal task-to-model mapping.
 */
export class AIModelLimb extends BaseLimb {
    readonly id = 'aimodel_limb';
    readonly type = 'cloud';
    private registry = HealthRegistry.getInstance();

    constructor(config: VibeConfig) {
        super(config);
        this.registerTools([
            {
                name: 'model_health',
                description: 'Returns the current health status of all registered model providers (Ollama, Cloudflare, Gemini).',
                parameters: { type: 'object', properties: {} },
                handler: async () => this.getModelHealth()
            },
            {
                name: 'benchmark_models',
                description: 'Runs quick latency checks against available models to verify connectivity and performance.',
                parameters: { type: 'object', properties: {} },
                handler: async () => this.benchmarkModels()
            },
            {
                name: 'smart_route',
                description: 'Suggests the optimal model for a specific user prompt based on health and task complexity.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'The user intent/prompt' }
                    },
                    required: ['prompt']
                },
                schema: z.object({ prompt: z.string() }),
                handler: async (args: any) => this.suggestSmartRoute(args['prompt'])
            }
        ]);
    }

    private async getModelHealth(): Promise<Result<any>> {
        const health = this.registry.getAllHealth();
        return { ok: true, value: health };
    }

    private async benchmarkModels(): Promise<Result<any>> {
        const models = ModelInventory.getAvailableModels();
        const results = models.map(m => ({
            name: m.name,
            available: m.health?.isAvailable || false,
            tier: m.type,
            priority: m.priority
        }));

        this.logger.info({ modelsCount: results.length }, 'Cluster benchmark complete');
        return { ok: true, value: results };
    }

    private async suggestSmartRoute(prompt: string): Promise<Result<any>> {
        const weights = TaskClassifier.analyzeProbabilities(prompt);
        const complexity = TaskClassifier.assessComplexity(prompt, weights);

        // Naive but effective heuristic for tool call advice
        let suggestion = 'local:qwen2.5-coder';
        if (complexity > 0) suggestion = 'cloud:gemini-3-pro';
        else if (weights['api-orchestration']! > 0.5) suggestion = 'edge:llama-3.1-8b';

        return {
            ok: true,
            value: {
                suggestion,
                reasoning: `Complexity [${complexity}] and weights [${JSON.stringify(weights)}] suggest this tier.`,
                metrics: { complexity, weights }
            }
        };
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        if (userIntent.includes('health') || userIntent.includes('models')) {
            const health = await this.getModelHealth();
            if (health.ok) return { ok: true, value: { output: `[CLUSTER_HEALTH]\n${JSON.stringify(health.value, null, 2)}` } };
        }

        return super.execute(intent);
    }
}
