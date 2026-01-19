import { NeuralLimb, Intent, Execution } from '../core/NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { AIDispatcher } from '../../api/ai/Dispatcher.js';
import pino from 'pino';

const logger = pino({
    name: 'MediaForgeLimb',
    base: { hostname: 'POG-VIBE' }
});

export class MediaForgeLimb implements NeuralLimb {
    id = 'media_forge';
    type = 'creative' as const;
    capabilities = ['imagen_v4_generation', 'veo_v3_video_generation', 'lyria_v2_music_generation'];

    private dispatcher: AIDispatcher;

    constructor(config: VibeConfig) {
        this.dispatcher = new AIDispatcher(config);
        logger.debug('MediaForgeLimb initialized');
    }

    async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        const keywords = ['generate', 'create', 'forge', 'image', 'video', 'music', 'sound', 'audio', 'visual'];
        const matchesKeyword = keywords.some(k => prompt.includes(k));

        // High certainty if specific esoteric substrates are mentioned
        const specificSubstrates = ['imagen', 'veo', 'lyria'];
        const matchesSubstrate = specificSubstrates.some(s => prompt.includes(s));

        return matchesKeyword || matchesSubstrate;
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        const prompt = intent.prompt.toLowerCase();
        let capabilityId = 'imagen_v4_generation'; // Default

        if (prompt.includes('video') || prompt.includes('veo')) {
            capabilityId = 'veo_v3_video_generation';
        } else if (prompt.includes('music') || prompt.includes('audio') || prompt.includes('lyria')) {
            capabilityId = 'lyria_v2_music_generation';
        }

        logger.info({ capabilityId, prompt: intent.prompt }, 'Executing esoteric media task');

        const response = await this.dispatcher.dispatch({
            capabilityId,
            payload: intent.prompt
        });

        if (!response.success) {
            return { ok: false, error: new Error(response.error || 'Media forge execution failed') };
        }

        return {
            ok: true,
            value: {
                output: `Successfully forged media using ${capabilityId}. Result available in project artifacts.`,
                data: response.result
            }
        };
    }
}
