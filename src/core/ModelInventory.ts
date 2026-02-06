import { StaticModelRegistry } from '../api/ai/StaticModelRegistry.js';
import { FreeModelConfig, ModelType } from './models.js';

/**
 * ModelInventory
 * Bridges the static registry (scraped from AI+API_LIST.md) to the dynamic router.
 */
export class ModelInventory {
    static getAvailableModels(): FreeModelConfig[] {
        return Object.values(StaticModelRegistry).map(cap => {
            const serviceType = cap.serviceType;
            const modelId = cap.modelId || 'unknown-model';

            const isLocal = serviceType === 'OLLAMA' || modelId.includes('qwen') || modelId.includes('llama');
            const taskType = cap.taskType.toLowerCase();

            return {
                name: modelId,
                command: isLocal ? `ollama run ${modelId}` : `gemini:${modelId}`,
                type: isLocal ? ModelType.Local : ModelType.CloudFree,
                capabilities: [taskType, 'agentic'],
                fallback: 'gemini-flash',
                maxTokens: 32768,
                priority: 50,
                health: {
                    isAvailable: true,
                    circuitLevel: 1
                }
            } as FreeModelConfig;
        });
    }

    /**
     * Helper to get full map for indexing
     */
    static getRegistry() {
        return StaticModelRegistry;
    }
}
