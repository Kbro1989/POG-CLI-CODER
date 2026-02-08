import { BaseLimb } from '../core/BaseLimb.js';
import type { Intent, Execution } from '../core/NeuralLimb.js';
import type { Result, VibeConfig, ModelResponse } from '../../core/models.js';
import { CloudflareServices } from '../../services/CloudflareServices.js';

// Cloudflare AI model IDs (from official templates)
const MODELS = {
    IMAGE: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    CHAT: '@cf/meta/llama-3.1-8b-instruct-fp8',
    EMBEDDING: '@cf/baai/bge-large-en-v1.5',
    WHISPER: '@cf/openai/whisper-large-v3-turbo',
    CODER: '@cf/qwen/qwen2.5-coder-32b-instruct',
    HEAVY: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    LIGHT: '@cf/meta/llama-3.2-3b-instruct'
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
    private healthState: ServiceHealthState = 'READY';
    private lastBackoffUntil: number = 0;

    constructor(config: VibeConfig) {
        super(config);
        const cfConfig: any = {
            accountId: (process.env['CLOUDFLARE_ACCOUNT_ID'] || config.cloudflareAccountId || '') as string,
            apiToken: (process.env['CLOUDFLARE_API_TOKEN'] || config.cloudflareApiToken || '') as string
        };
        if (process.env['CLOUDFLARE_WORKER_URL']) {
            cfConfig.gatewayUrl = process.env['CLOUDFLARE_WORKER_URL'];
        }
        this.services = new CloudflareServices(cfConfig);

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

    /**
     * Specialized status for Cloudflare AI monitoring
     */
    public override getStatus(): Record<string, any> {
        const base = super.getStatus();
        const health = this.getHealth();
        return {
            ...base,
            health: health.state,
            cooldown: health.cooldownSeconds,
            backoffUntil: this.lastBackoffUntil > 0 ? new Date(this.lastBackoffUntil).toISOString() : 'None',
            provider: 'Cloudflare Workers AI'
        };
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
                        category: { type: 'string', description: 'Model category (e.g., items, npcs)' },
                        id: { type: 'string', description: 'Specific model/item ID' }
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

    override async canHandle(intent: Intent): Promise<boolean> {
        // Ternary Availability Check
        const health = this.getHealth();
        if (health.state === 'CRITICAL_FAILURE' || !this.services.getAccountId()) return false;

        const p = this.getUserIntent(intent).toLowerCase();

        // Only match explicit Cloudflare/CF requests, not generic app generation
        const cfKeywords = ['cloudflare', 'cf_', 'workers ai', 'r2 bucket', 'r2 storage'];
        return cfKeywords.some(kw => p.includes(kw));
    }

    /**
     * Execute handles direct intents by listing available tools
     */
    override async execute(_intent: Intent): Promise<Result<Execution>> {
        const tools = this.getTools();
        const toolNames = tools.map((t: any) => t.function?.name || t.name).join(', ');

        return {
            ok: true,
            value: {
                output: `Cloudflare AI Limb is ready. Available tools: ${toolNames}\n\nTo use, specify a tool like: "use cf_generate_image to create..."`,
                data: { availableTools: toolNames }
            }
        };
    }

    async generateEmbeddings(texts: string[]): Promise<Result<number[][]>> {
        const model = MODELS.EMBEDDING;
        const result = await this.services.runAi(model, {
            text: texts
        });

        if (!result.ok) {
            this.handleApiError(result.error);
            return result;
        }
        return { ok: true, value: result.value.data };
    }

    private selectOptimalModel(intent: string, prompt: string): string {
        const p = prompt.toLowerCase();

        if (intent === 'code' || p.includes('code') || p.includes('typescript') || p.includes('javascript')) {
            return MODELS.CODER;
        }

        if (intent === 'reasoning' || p.length > 500 || p.includes('analyze') || p.includes('explain')) {
            return MODELS.HEAVY;
        }

        if (p.length < 100 && !p.includes('complex')) {
            return MODELS.LIGHT;
        }

        return MODELS.CHAT;
    }

    private async generateImage(prompt: string, negativePrompt?: string, width: number = 1024, height: number = 1024): Promise<Result<Uint8Array>> {
        try {
            const model = MODELS.IMAGE;
            this.logger.info({ model, prompt: prompt.substring(0, 50), width, height }, 'Generating image via Cloudflare AI Hub');

            const health = this.getHealth();
            if (health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`Cloudflare AI is rate limited. Cooldown: ${health.cooldownSeconds}s`) };
            }

            const result = await this.services.runAi<Buffer>(model, {
                prompt,
                negative_prompt: negativePrompt,
                width,
                height
            });

            if (!result.ok) {
                this.handleApiError(result.error);
                // Last ditch: Ghost Limb fallback for 3D/Image scaffold
                const ghostResult = await this.services.runGhostLimb<any>('3d-scaffold', { prompt });
                if (ghostResult.ok) {
                    this.logger.info('Using Ghost Limb deterministic 3D scaffold fallback');
                    // Mock binary response from ghost result if possible, or return error
                }
                return { ok: false, error: result.error };
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

            const lastMessage = messages[messages.length - 1]?.content || '';
            const model = this.selectOptimalModel('chat', lastMessage);

            this.logger.info({ model, messageCount: messages.length }, 'Chat completion via Cloudflare AI Hub');

            const startTime = Date.now();
            const result = await this.services.runAi(model, {
                messages,
                max_tokens: maxTokens
            });

            if (!result.ok) {
                this.handleApiError(result.error);
                // Last ditch: Ghost Limb fallback
                const ghostTask = model === MODELS.CODER ? 'code-scaffold' : 'text-template';
                const ghostResult = await this.services.runGhostLimb(ghostTask, { prompt: lastMessage });

                if (ghostResult.ok) {
                    return {
                        ok: true,
                        value: {
                            model: `ghost:${ghostTask}`,
                            response: (ghostResult.value as any).result || JSON.stringify(ghostResult.value),
                            latency: Date.now() - startTime
                        }
                    };
                }
                return result;
            }

            return {
                ok: true,
                value: {
                    model: model,
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

            const model = '@cf/meta/llama-3.2-11b-vision-instruct'; // Optimal vision model
            this.logger.info({ model, prompt: prompt.substring(0, 50) }, 'Vision analysis via Cloudflare AI Hub');

            return await this.services.runAi(model, {
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image', image: imageBase64 }
                        ]
                    }
                ]
            });
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleSpeech(text: string): Promise<Result<Uint8Array>> {
        try {
            const health = this.getHealth();
            if (health.state === 'RATE_LIMITED') return { ok: false, error: new Error('Rate limited') };

            const model = MODELS.WHISPER;
            this.logger.info({ model, text: text.substring(0, 50) }, 'Speech synthesis via Cloudflare AI Hub');

            const result = await this.services.runAi<Buffer>(model, { text });
            if (!result.ok) return result;
            return { ok: true, value: new Uint8Array(result.value) };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleRsmv(gameSource: string, category: string, id?: string): Promise<Result<unknown>> {
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
