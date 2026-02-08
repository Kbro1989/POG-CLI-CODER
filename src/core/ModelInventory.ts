import { StaticModelRegistry } from '../api/ai/StaticModelRegistry.js';
import { FreeModelConfig, ModelType } from './models.js';

/**
 * ModelInventory
 * Bridges the static registry (scraped from AI+API_LIST.md) to the dynamic router.
 */
export class ModelInventory {
    static getAvailableModels(): FreeModelConfig[] {
        return Object.values(StaticModelRegistry).map(cap => {
            const serviceType = cap.serviceType as string;
            const modelId = cap.modelId || 'unknown-model';
            const id = cap.id;

            const isLocal = serviceType === 'OLLAMA';
            const isCloudflare = serviceType === 'MEDIA_FORGE' && modelId.startsWith('@cf');
            const isGemini = serviceType === 'GEMINI';

            let type = ModelType.CloudFree;
            if (isLocal) type = ModelType.Local;
            else if (isCloudflare) type = ModelType.Cloudflare;

            const taskType = cap.taskType.toLowerCase();

            // Determine command
            let command = `google:${modelId}`;
            if (isLocal) command = `ollama run ${modelId}`;
            else if (isCloudflare) command = `cloudflare:run ${modelId}`;

            // Determine Priority & Dynamic Fallback
            let priority = id.startsWith('gold_') ? 90 : 50;
            if (id.startsWith('side_')) priority = 70; // High priority for side-tasks
            if (id.includes('pro')) priority = 100;
            if (id.includes('flash')) priority = 80;

            // Tiered Fallback Logic (Trinity Substrate)
            let fallback: string | undefined;
            if (isGemini) {
                // Gemini (Reasoning) falls back to Cloudflare (Utility)
                fallback = 'gold_cloudflare_llama_3_1';
            } else if (isCloudflare) {
                // Cloudflare (Utility) falls back to Local (Sovereign)
                fallback = 'gold_qwen_2_5_coder_7b';
            } else if (id.startsWith('side_')) {
                // Side models fall back to primary local core
                fallback = 'gold_qwen_2_5_coder_7b';
            } else if (isLocal) {
                // Local core is the final substrate floor
                fallback = undefined;
            }

            return {
                name: modelId,
                command,
                type,
                capabilities: [taskType, 'agentic'],
                fallback: fallback || 'gold_qwen_2_5_coder_7b', // Final Sovereign floor
                maxTokens: id.includes('pro') ? 128000 : 32768,
                priority
                // Health is determined dynamically by Router.getModelHealthGrid()
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
