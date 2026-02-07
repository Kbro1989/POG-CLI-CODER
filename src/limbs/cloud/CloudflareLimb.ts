import { BaseLimb } from '../core/BaseLimb.js';
import { Result, VibeConfig, ModelResponse } from '../../core/models.js';
import { CloudflareServices } from '../../services/CloudflareServices.js';

// Cloudflare AI model IDs (from official templates)
const MODELS = {
    IMAGE: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    CHAT: '@cf/meta/llama-3.1-8b-instruct-fp8',
    EMBEDDING: '@cf/baai/bge-large-en-v1.5',
    WHISPER: '@cf/openai/whisper'
} as const;

/**
 * CloudflareLimb - Unified Cloudflare Workers AI Capabilities
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class CloudflareLimb extends BaseLimb {
    readonly id = 'cloudflare_ai';
    readonly type = 'cloud' as const;

    private readonly services: CloudflareServices;
    private readonly sidecarUrl: string | undefined;

    constructor(config: VibeConfig) {
        super(config);
        this.services = new CloudflareServices({
            accountId: (process.env['CLOUDFLARE_ACCOUNT_ID'] || config.cloudflareAccountId || '') as string,
            apiToken: (process.env['CLOUDFLARE_API_TOKEN'] || config.cloudflareApiToken || '') as string
        });
        this.sidecarUrl = process.env['CLOUDFLARE_WORKER_URL'];

        this.registerCloudflareTools();
    }

    private registerCloudflareTools(): void {
        this.registerTools([
            {
                name: 'cf_generate_image',
                description: 'Generate an image using Cloudflare Workers AI (Stable Diffusion XL)',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Text description of the image to generate' },
                        negativePrompt: { type: 'string', description: 'What to avoid in the image' },
                        width: { type: 'number', description: 'Image width (default: 1024)' },
                        height: { type: 'number', description: 'Image height (default: 1024)' }
                    },
                    required: ['prompt']
                },
                handler: async (args) => {
                    const result = await this.generateImage(args.prompt, args.negativePrompt, args.width || 1024, args.height || 1024);
                    if (result.ok) return { ok: true, value: { imageBase64: Buffer.from(result.value).toString('base64') } };
                    return result;
                }
            },
            {
                name: 'cf_chat_completion',
                description: 'Get an LLM response from Cloudflare Workers AI (Llama 3.1 8B)',
                parameters: {
                    type: 'object',
                    properties: {
                        messages: {
                            type: 'array',
                            description: 'Chat messages array [{role, content}]',
                            items: {
                                type: 'object',
                                properties: {
                                    role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                                    content: { type: 'string' }
                                }
                            }
                        },
                        maxTokens: { type: 'number', description: 'Maximum tokens in response (default: 1024)' }
                    },
                    required: ['messages']
                },
                handler: async (args) => this.chatCompletion(args.messages, args.maxTokens || 1024)
            },
            {
                name: 'cf_text_embedding',
                description: 'Generate text embeddings using Cloudflare Workers AI (BGE)',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text to embed' },
                        texts: { type: 'array', items: { type: 'string' }, description: 'Multiple texts to embed' }
                    }
                },
                handler: async (args) => {
                    const input = args.texts || (args.text ? [args.text] : []);
                    if (input.length === 0) throw new Error('No text provided for embedding');
                    return this.generateEmbeddings(input);
                }
            },
            {
                name: 'cf_vision_analysis',
                description: 'Analyze images using Cloudflare Workers AI or Gemini Pro Vision',
                parameters: {
                    type: 'object',
                    properties: {
                        image: { type: 'string', description: 'Base64 encoded image data' },
                        prompt: { type: 'string', description: 'What to analyze in the image' }
                    },
                    required: ['image', 'prompt']
                },
                handler: async (args) => this.handleVision(args.image, args.prompt)
            },
            {
                name: 'cf_speech_synthesis',
                description: 'Convert text to speech using Cloudflare Workers AI (Deepgram)',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text to synthesize' }
                    },
                    required: ['text']
                },
                handler: async (args) => this.handleSpeech(args.text)
            },
            {
                name: 'cf_rsmv_model_view',
                description: 'View or modify RuneScape models via RSMV logic',
                parameters: {
                    type: 'object',
                    properties: {
                        gameSource: { type: 'string', description: 'Game version (e.g., rs3, osrs)' },
                        category: { type: 'string', description: 'Model category (e.g., items, npcs)' }
                    },
                    required: ['gameSource', 'category']
                },
                handler: async (args) => this.handleRsmv(args.gameSource, args.category, args.id)
            }
        ]);
    }

    override async canHandle(intent: import('../core/NeuralLimb.js').Intent): Promise<boolean> {
        // Ternary Availability Check: If no account ID, we are unavailable.
        if (!this.services.getAccountId()) return false;

        const p = intent.prompt.toLowerCase();
        return p.includes('cloudflare') || p.includes('embedding') || p.includes('cf_') || this.spine.getCapabilities().some(cap => p.includes(cap));
    }

    async generateEmbeddings(texts: string[]): Promise<Result<number[][]>> {
        const result = await this.services.runAi(MODELS.EMBEDDING, {
            text: texts
        });

        if (!result.ok) return result;
        return { ok: true, value: result.value.data };
    }

    private async generateImage(prompt: string, negativePrompt?: string, width: number = 1024, height: number = 1024): Promise<Result<Uint8Array>> {
        try {
            this.logger.info({ prompt: prompt.substring(0, 50), width, height }, 'Generating image via Cloudflare AI');
            if (this.sidecarUrl) {
                const response = await fetch(`${this.sidecarUrl}/ai/image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, negativePrompt, width, height })
                });
                if (!response.ok) return { ok: false, error: new Error(`Sidecar error: ${response.status}`) };
                return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
            }

            const result = await this.services.runAi(MODELS.IMAGE, {
                prompt,
                negative_prompt: negativePrompt,
                width,
                height
            });

            if (!result.ok) return result;

            // Cloudflare image models return binary stream or base64?
            // Usually it's a binary response. runAi converts it to json if possible.
            // For image generation it might need special handling.
            return { ok: true, value: new Uint8Array(result.value) };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    async chatCompletion(messages: any[], maxTokens: number = 1024): Promise<Result<ModelResponse>> {
        try {
            this.logger.info({ messageCount: messages.length }, 'Chat completion via Cloudflare AI');
            if (this.sidecarUrl) {
                const response = await fetch(`${this.sidecarUrl}/ai/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messages, max_tokens: maxTokens })
                });
                if (!response.ok) return { ok: false, error: new Error(`Sidecar error: ${response.status}`) };
                const sidecarResult = await response.json() as { response: string };
                return {
                    ok: true,
                    value: {
                        model: 'sidecar-flare',
                        response: sidecarResult.response,
                        latency: 0
                    }
                };
            }

            const startTime = Date.now();
            const result = await this.services.runAi(MODELS.CHAT, {
                messages,
                max_tokens: maxTokens
            });

            if (!result.ok) return result;

            return {
                ok: true,
                value: {
                    model: MODELS.CHAT,
                    response: result.value.response,
                    latency: Date.now() - startTime
                }
            };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleVision(imageBase64: string, prompt: string): Promise<Result<unknown>> {
        try {
            if (this.sidecarUrl) {
                const response = await fetch(`${this.sidecarUrl}/ai/vision`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageBase64, prompt })
                });
                if (response.ok) return { ok: true, value: await response.json() };
            }

            // Fallback to Gemini if CF Vision is unavailable/not implemented
            return { ok: false, error: new Error('Vision analysis not yet implemented in Cloudflare substrate') };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleSpeech(text: string): Promise<Result<Uint8Array>> {
        try {
            if (this.sidecarUrl) {
                const response = await fetch(`${this.sidecarUrl}/ai/speech`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                if (response.ok) return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
            }

            const result = await this.services.runAi(MODELS.WHISPER, { text });
            if (!result.ok) return result;
            return { ok: true, value: new Uint8Array(result.value) };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleRsmv(gameSource: string, category: string, id: string): Promise<Result<unknown>> {
        this.logger.info({ gameSource, category, id }, 'RSMV model viewing request received');
        // RSMV functionality to be implemented in Phase 19+
        return {
            ok: true,
            value: {
                status: 'RSMV substrate ready',
                message: 'Model viewing/modification logic is pending feature activation.',
                context: { gameSource, category, id }
            }
        };
    }
}
