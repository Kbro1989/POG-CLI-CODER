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

            // Determine Priority & Fallback
            let priority = id.startsWith('gold_') ? 90 : 50;
            let fallback: string | undefined = 'gold_gemini_3_flash';

            if (id.includes('pro')) priority = 100;
            if (id.includes('flash')) priority = 80;

            // Tiered Fallback Logic
            if (isGemini) fallback = (id.includes('pro')) ? 'gold_gemini_3_flash' : 'gold_cloudflare_llama_3_1';
            if (isCloudflare) fallback = 'gold_qwen_2_5_coder_7b';
            if (isLocal) fallback = 'gold_gemini_3_flash'; // Local failure jumps to cloud-flash

            return {
                name: modelId,
                command,
                type,
                capabilities: [taskType, 'agentic'],
                fallback,
                maxTokens: id.includes('pro') ? 128000 : 32768,
                priority,
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
