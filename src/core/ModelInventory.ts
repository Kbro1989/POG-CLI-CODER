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
            if (id.includes('pro')) priority = 100;
            if (id.includes('flash')) priority = 80;

            // Tiered Fallback Logic (Capability-aware)
            let fallback: string | undefined;
            if (isLocal) {
                // Local fallback jumps to Cloudflare or Gemini based on task
                fallback = (taskType === 'image' || taskType === 'vision') ? 'gold_cloudflare_flux_dev' : 'gold_gemini_3_flash';
            } else if (isCloudflare) {
                // Cloudflare fallback jumps to Gemini Pro or Flash
                fallback = (id.includes('flux') || id.includes('vision')) ? 'gold_gemini_3_flash' : 'gold_gemini_pro';
            } else if (isGemini) {
                // Gemini Pro falls back to Flash; Flash falls back to Cloudflare Llama
                fallback = (id.includes('pro')) ? 'gold_gemini_3_flash' : 'gold_cloudflare_llama_3_1';
            }

            return {
                name: modelId,
                command,
                type,
                capabilities: [taskType, 'agentic'],
                fallback: fallback || 'gold_gemini_3_flash', // Ultimate default
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
