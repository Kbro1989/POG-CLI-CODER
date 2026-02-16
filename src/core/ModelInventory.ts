import { StaticModelRegistry } from '../api/ai/StaticModelRegistry.js';
import { FreeModelConfig, ModelType } from './models.js';

/**
 * ModelInventory
 * Bridges the static registry (scraped from AI+API_LIST.md) to the dynamic router.
 */
export class ModelInventory {
    static getAvailableModels(config?: import('./models.js').VibeConfig): FreeModelConfig[] {
        return Object.values(StaticModelRegistry).map(cap => {
            const serviceType = cap.serviceType as string;
            const modelId = cap.modelId || 'unknown-model';
            const id = cap.id;

            const isLocal = serviceType === 'OLLAMA';
            const isCloudflare = serviceType === 'MEDIA_FORGE' && modelId.startsWith('@cf');
            const isHuggingFace = serviceType === 'HUGGINGFACE';

            let type = ModelType.CloudFree;
            if (isLocal) type = ModelType.Local;
            else if (isCloudflare) type = ModelType.Cloudflare;
            else if (isHuggingFace) type = ModelType.CloudFree;

            const taskType = cap.taskType.toUpperCase();
            const capabilities: string[] = ['agentic']; // All models are agentic by default in Bunker Mode

            // Map taskType to ModelAbility enum values
            if (taskType === 'IMAGE') capabilities.push('IMAGE_GEN');
            else if (taskType === 'VISION') capabilities.push('VISION');
            else if (taskType === 'TEXT') capabilities.push('CHAT', 'CODE');
            else if (taskType === 'AUDIO') capabilities.push('TRANSCRIPTION', 'TTS');
            else capabilities.push(taskType);

            // Determine command
            let command = `google:${modelId}`;
            if (isLocal) command = `ollama run ${modelId}`;
            else if (isCloudflare) command = `cloudflare:run ${modelId}`;
            else if (isHuggingFace) command = `huggingface:${modelId}`;

            // ═══════════════════════════════════════════════════
            // LOCAL-FIRST PRIORITY: Local = 90+, Cloud = 30
            // Cloud is an ADDITION, not a fallback.
            // ═══════════════════════════════════════════════════
            let priority = 30; // Cloud default: low priority
            if (isLocal) {
                priority = 90; // Local: sovereign priority
                if (id.includes('coder')) priority = 95;
            }
            if (id.includes('pro')) priority = Math.min(priority + 10, 100);

            // .env Role Overrides (Hyper-Priority for LOCAL models)
            if (config) {
                if (config.planningModel === modelId || config.planningModel === id) priority = 110;
                if (config.codingModel === modelId || config.codingModel === id) priority = 110;
                if (config.criticModel === modelId || config.criticModel === id) priority = 110;
                if (config.monitorModel === modelId || config.monitorModel === id) priority = 110;
            }

            // ═══════════════════════════════════════════════════
            // ALL FALLBACKS → LOCAL. No cloud-to-cloud chains.
            // ═══════════════════════════════════════════════════
            const fallback = isLocal ? undefined : (config?.codingModel || 'qwen2.5-coder:7b-instruct-q4_K_M');

            return {
                name: modelId,
                command,
                type,
                capabilities,
                fallback: fallback || 'gold_qwen_2_5_coder_7b',
                maxTokens: id.includes('pro') ? 128000 : 32768,
                priority
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
