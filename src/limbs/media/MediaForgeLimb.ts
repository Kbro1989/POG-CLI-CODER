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
    private modelExecutor: any; // Injected for Cloudflare support

    constructor(config: VibeConfig, modelExecutor?: any) {
        this.dispatcher = new AIDispatcher(config);
        this.modelExecutor = modelExecutor;
        logger.debug('MediaForgeLimb initialized');
    }

    async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        const keywords = ['generate', 'create', 'forge', 'image', 'video', 'music', 'sound', 'audio', 'visual'];
        const matchesKeyword = keywords.some(k => prompt.includes(k));

        // High certainty if specific esoteric substrates or Cloudflare intent are mentioned
        const specificSubstrates = ['imagen', 'veo', 'lyria', 'cloudflare', 'workers ai'];
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

        // Check for Cloudflare preference
        if (prompt.includes('cloudflare') || prompt.includes('cf')) {
            const cfResult = await this.handleCloudflareMedia(prompt);
            if (cfResult.ok) return cfResult;
        }

        const result = await this.handleToolCall(capabilityId, intent.prompt);
        if (!result.ok) return { ok: false, error: result.error };

        return {
            ok: true,
            value: {
                output: result.value.output,
                data: result.value.data
            }
        };
    }

    private async handleCloudflareMedia(prompt: string): Promise<Result<Execution>> {
        if (!this.modelExecutor) return { ok: false, error: new Error('ModelExecutor not available') };

        logger.info({ prompt }, 'Attempting Cloudflare media generation');
        const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
        const result = await this.modelExecutor.callCloudflareAI(model, { prompt });

        if (!result.ok) return result;

        return {
            ok: true,
            value: {
                output: `Successfully generated media using Cloudflare model: ${model}`,
                data: result.value
            }
        };
    }

    getTools(): any[] {
        return [
            {
                functionDeclarations: [
                    {
                        name: 'imagen_v4_generation',
                        description: 'Generate or edit high-quality images from text descriptions.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Detailed description of the image to generate' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'cloudflare_image_gen',
                        description: 'Generate images using Cloudflare Workers AI.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Visual description for the image' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'veo_v3_video_generation',
                        description: 'Generate short videos with audio from text prompts.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Visual and auditory description for the video' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'lyria_v2_music_generation',
                        description: 'Generate high-quality instrumental music from text descriptions.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Style, mood, and instrumentation requirements' }
                            },
                            required: ['prompt']
                        }
                    }
                ]
            }
        ];
    }

    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        if (name === 'cloudflare_image_gen') {
            const prompt = typeof args === 'string' ? args : args.prompt;
            const res = await this.handleCloudflareMedia(prompt);
            if (res.ok) return { ok: true, value: { output: res.value.output, data: res.value.data } };
            return res;
        }

        logger.info({ capabilityId: name, args }, 'Executing media forge tool call');
        const payload = typeof args === 'string' ? args : args.prompt;

        const response = await this.dispatcher.dispatch({
            capabilityId: name,
            payload
        });

        if (!response.success) {
            return { ok: false, error: new Error(response.error || `Media forge tool ${name} failed`) };
        }

        return {
            ok: true,
            value: {
                output: `Successfully forged media using ${name}.`,
                data: response.result
            }
        };
    }
}

