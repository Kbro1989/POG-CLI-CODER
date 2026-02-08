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
export type ServiceHealthState = 'READY' | 'RATE_LIMITED' | 'CRITICAL_FAILURE';

export class CloudflareLimb extends BaseLimb {
    readonly id = 'cloudflare_ai';
    readonly type = 'cloud' as const;

    private readonly services: CloudflareServices;
    private readonly sidecarUrl: string | undefined;

    private healthState: ServiceHealthState = 'READY';
    private lastBackoffUntil: number = 0;

    constructor(config: VibeConfig) {
        super(config);
        this.services = new CloudflareServices({
            accountId: (process.env['CLOUDFLARE_ACCOUNT_ID'] || config.cloudflareAccountId || '') as string,
            apiToken: (process.env['CLOUDFLARE_API_TOKEN'] || config.cloudflareApiToken || '') as string
        });
        this.sidecarUrl = process.env['CLOUDFLARE_WORKER_URL'];

        // Register health provider
        import('../../core/HealthRegistry.js').then(m => {
            m.HealthRegistry.getInstance().registerProvider('cloudflare', () => this.getHealth());
        });

        this.registerCloudflareTools();
    }

    /**
     * Report current service health and availability
     */
    public getHealth(): { state: ServiceHealthState; cooldownSeconds: number } {
        const now = Date.now();
        if (this.healthState === 'RATE_LIMITED' && now < this.lastBackoffUntil) {
            return { state: 'RATE_LIMITED', cooldownSeconds: Math.ceil((this.lastBackoffUntil - now) / 1000) };
        }

        if (this.healthState === 'RATE_LIMITED' && now >= this.lastBackoffUntil) {
            this.healthState = 'READY';
        }

        return { state: this.healthState, cooldownSeconds: 0 };
    }

    private registerCloudflareTools(): void {
        this.registerTools([
            {
                name: 'cf_get_health',
                description: 'Get the current health and quota status of the Cloudflare AI limb',
                parameters: { type: 'object', properties: {} },
                handler: async () => {
                    const health = this.getHealth();
                    return { ok: true, value: health };
                }
            },
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
            },
            {
                name: 'cf_save_asset',
                description: 'Save an AI-generated asset (image, text, data) to persistent R2 storage',
                parameters: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', description: 'Unique object key/filename' },
                        data: { type: 'string', description: 'Base64 encoded data to save' },
                        contentType: { type: 'string', description: 'MIME type of the asset' },
                        bucket: { type: 'string', description: 'R2 bucket name (default: workspace-bucketsespreview)' }
                    },
                    required: ['key', 'data', 'contentType']
                },
                handler: async (args) => {
                    const bucket = args.bucket || 'workspace-bucketsespreview';
                    const buffer = Buffer.from(args.data, 'base64');
                    return this.services.putObject(bucket, args.key, buffer, args.contentType);
                }
            },
            {
                name: 'cf_get_asset',
                description: 'Retrieve an asset from persistent R2 storage',
                parameters: {
                    type: 'object',
                    properties: {
                        key: { type: 'string', description: 'Object key/filename' },
                        bucket: { type: 'string', description: 'R2 bucket name (default: workspace-bucketsespreview)' }
                    },
                    required: ['key']
                },
                handler: async (args) => {
                    const bucket = args.bucket || 'workspace-bucketsespreview';
                    const result = await this.services.getObject(bucket, args.key);
                    if (result.ok) {
                        return { ok: true, value: { base64: Buffer.from(result.value).toString('base64') } };
                    }
                    return result;
                }
            },
            {
                name: 'cf_orchestrate_pipeline',
                description: 'Execute a multi-stage creative pipeline (Interpret -> Generate -> Persist)',
                parameters: {
                    type: 'object',
                    properties: {
                        task: { type: 'string', description: 'Creative task description (e.g., "Generate a futuristic RS3 login screen")' },
                        pipeline: { type: 'string', enum: ['image_gen', 'code_forge', 'assets_bake'] }
                    },
                    required: ['task']
                },
                handler: async (args) => this.handlePipeline(args.task, args.pipeline || 'image_gen')
            }
        ]);
    }

    override async canHandle(intent: import('../core/NeuralLimb.js').Intent): Promise<boolean> {
        // Ternary Availability Check
        const health = this.getHealth();
        if (health.state === 'CRITICAL_FAILURE' || !this.services.getAccountId()) return false;

        const p = intent.prompt.toLowerCase();
        return p.includes('cloudflare') || p.includes('embedding') || p.includes('cf_') || this.spine.getCapabilities().some(cap => p.includes(cap));
    }

    async generateEmbeddings(texts: string[]): Promise<Result<number[][]>> {
        const result = await this.services.runAi(MODELS.EMBEDDING, {
            text: texts
        });

        if (!result.ok) {
            this.handleApiError(result.error);
            return result;
        }
        return { ok: true, value: result.value.data };
    }

    private async generateImage(prompt: string, negativePrompt?: string, width: number = 1024, height: number = 1024): Promise<Result<Uint8Array>> {
        try {
            this.logger.info({ prompt: prompt.substring(0, 50), width, height }, 'Generating image via Cloudflare AI');

            const health = this.getHealth();
            if (health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`Cloudflare AI is rate limited. Cooldown: ${health.cooldownSeconds}s`) };
            }

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

            if (!result.ok) {
                this.handleApiError(result.error);
                return result;
            }

            return { ok: true, value: new Uint8Array(result.value) };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    async chatCompletion(messages: any[], maxTokens: number = 1024): Promise<Result<ModelResponse>> {
        try {
            const health = this.getHealth();
            if (health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`Cloudflare AI is rate limited. Cooldown: ${health.cooldownSeconds}s`) };
            }

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

            if (!result.ok) {
                this.handleApiError(result.error);
                return result;
            }

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

    private handleApiError(error: Error): void {
        const msg = error.message.toLowerCase();
        if (msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit')) {
            this.healthState = 'RATE_LIMITED';

            // Extract precise retry-after if available via bracket pattern
            const match = error.message.match(/\[RETRY_AFTER:(\d+)\]/);
            const retryAfterSec = (match && match[1]) ? parseInt(match[1], 10) : 30;

            this.lastBackoffUntil = Date.now() + (retryAfterSec * 1000);
            this.logger.warn({ cooldown: retryAfterSec, source: 'header' }, 'Cloudflare AI rate limit detected - entering precise backoff');
        } else if (msg.includes('401') || msg.includes('403')) {
            this.healthState = 'CRITICAL_FAILURE';
            this.logger.error('Cloudflare AI authentication failure - critical state');
        }
    }

    private async handleVision(imageBase64: string, prompt: string): Promise<Result<unknown>> {
        try {
            const health = this.getHealth();
            if (health.state === 'RATE_LIMITED') return { ok: false, error: new Error('Rate limited') };

            if (this.sidecarUrl) {
                const response = await fetch(`${this.sidecarUrl}/ai/vision`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: imageBase64, prompt })
                });
                if (response.ok) return { ok: true, value: await response.json() };
            }

            return { ok: false, error: new Error('Vision analysis not yet implemented in Cloudflare substrate') };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleSpeech(text: string): Promise<Result<Uint8Array>> {
        try {
            const health = this.getHealth();
            if (health.state === 'RATE_LIMITED') return { ok: false, error: new Error('Rate limited') };

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
        return {
            ok: true,
            value: {
                status: 'RSMV substrate ready',
                message: 'Model viewing/modification logic is pending feature activation.',
                context: { gameSource, category, id }
            }
        };
    }

    private async handlePipeline(task: string, type: 'image_gen' | 'code_forge' | 'assets_bake'): Promise<Result<unknown>> {
        this.logger.info({ task, type }, 'Executing agentic pipeline');

        // Phase 1: Interpreter (Use native Llama 3.1 8B on CF)
        const interpreterPrompt = `You are the Cloudflare Pipeline Interpreter. 
Task: "${task}"
Type: "${type}"
Decompose this into a specific image prompt. 
Output ONLY the final prompt for the image generator.`;

        const interpretation = await this.chatCompletion([
            { role: 'system', content: 'You are a precise prompt engineer.' },
            { role: 'user', content: interpreterPrompt }
        ]);

        if (!interpretation.ok) return interpretation;
        const refinedPrompt = interpretation.value.response.trim();
        this.logger.info({ refinedPrompt }, 'Pipeline interpretation complete');

        // Phase 2: Generation
        const generation = await this.generateImage(refinedPrompt);
        if (!generation.ok) return generation;

        // Phase 3: Persistence (Auto-save to R2)
        const assetName = `pipeline_${Date.now()}.png`;
        const persistence = await this.services.putObject(
            'workspace-bucketsespreview',
            assetName,
            generation.value,
            'image/png'
        );

        if (!persistence.ok) {
            this.logger.error({ error: persistence.error }, 'Pipeline persistence failed, returning raw result');
            return {
                ok: true,
                value: {
                    status: 'Partial Success',
                    asset: Buffer.from(generation.value).toString('base64'),
                    error: 'Storage failure'
                }
            };
        }

        return {
            ok: true,
            value: {
                status: 'Success',
                assetName,
                bucket: 'workspace-bucketsespreview',
                previewUrl: `https://pub-r2.cloudflare.com/${assetName}` // Hypothetical public URL pattern
            }
        };
    }
}
