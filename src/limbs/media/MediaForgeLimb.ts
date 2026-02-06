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

