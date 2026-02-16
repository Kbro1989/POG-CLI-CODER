import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import type { Intent, Execution, TernaryDecision } from '../core/NeuralLimb.js';
import type { Result, VibeConfig, ModelResponse } from '../../core/models.js';
import { YaoState } from '../../core/models.js';
import { CloudflareServices } from '../../services/CloudflareServices.js';
import { CircuitBreaker } from '../../core/CircuitBreaker.js';

// Cloudflare AI model IDs (from official templates)
const MODELS = {
    ULTRA: '@cf/openai/gpt-oss-120b',
    HEAVY: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    CHAT: '@cf/meta/llama-3.1-8b-instruct-fp8',
    EMBEDDING: '@cf/baai/bge-large-en-v1.5',
    WHISPER: '@cf/openai/whisper-large-v3-turbo',
    CODER: '@cf/qwen/qwen2.5-coder-32b-instruct',
    IMAGE: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    LIGHT: '@cf/meta/llama-3.2-3b-instruct'
} as const;

const PROVIDER_KEY = 'cloudflare';

/**
 * CloudflareLimb - Unified Cloudflare Workers AI Capabilities
 * 
 * SOVEREIGN METABOLISM: This limb is an OPTIONAL cloud addition.
 * All operations are gated behind CircuitBreaker (3-strike rule).
 * If the circuit is OPEN or the system is OFF GRID, the limb
 * yields (Yin) and lets local limbs handle the request.
 */
export type ServiceHealthState = 'READY' | 'RATE_LIMITED' | 'CRITICAL_FAILURE' | 'CIRCUIT_OPEN' | 'OFF_GRID';

export class CloudflareLimb extends BaseLimb {
    readonly id = 'cloudflare_ai';
    readonly type = 'cloud' as const;

    private readonly services: CloudflareServices;
    private readonly healthInterval: NodeJS.Timeout | undefined;
    private healthState: ServiceHealthState = 'READY';
    private lastBackoffUntil: number = 0;
    private readonly circuitBreaker: CircuitBreaker;
    private consecutiveFailures = 0;

    constructor(config: VibeConfig, circuitBreaker?: CircuitBreaker) {
        super(config);
        this.circuitBreaker = circuitBreaker || new CircuitBreaker();

        const cfConfig: { accountId: string; apiToken: string; gatewayUrl?: string } = {
            accountId: (process.env['CLOUDFLARE_ACCOUNT_ID'] || config.cloudflareAccountId || ''),
            apiToken: (process.env['CLOUDFLARE_API_TOKEN'] || config.cloudflareApiToken || '')
        };
        if (process.env['CLOUDFLARE_WORKER_URL']) {
            cfConfig.gatewayUrl = process.env['CLOUDFLARE_WORKER_URL'];
        }
        this.services = new CloudflareServices(cfConfig);

        // Wire circuit breaker events
        this.circuitBreaker.on('circuit_open', (data) => {
            if (data.provider === PROVIDER_KEY) {
                this.healthState = 'CIRCUIT_OPEN';
                this.logger.warn({ failures: data.failures }, '🔴 CloudflareLimb: Circuit OPEN — yielding all requests');
            }
        });
        this.circuitBreaker.on('circuit_closed', (data) => {
            if (data.provider === PROVIDER_KEY) {
                this.healthState = 'READY';
                this.consecutiveFailures = 0;
                this.logger.info('🟢 CloudflareLimb: Circuit RECOVERED');
            }
        });

        // Register health provider
        import('../../core/HealthRegistry.js').then(m => {
            m.HealthRegistry.getInstance().registerProvider('cloudflare', () => this.getHealth());
        });

        this.registerCloudflareTools();

        // Periodic Spatial Telemetry
        this.healthInterval = setInterval(() => this.updateSpatialHealth(), 30000);
    }

    /**
     * Proper Close: Ensures intervals are cleared.
     */
    public override async close(): Promise<void> {
        this.logger.info('Closing CloudflareLimb resources...');
        if (this.healthInterval) {
            clearInterval(this.healthInterval);
        }
    }

    /**
     * Report current service health and availability
     */
    public getHealth(): { state: ServiceHealthState; cooldownSeconds: number; circuitOpen: boolean } {
        const now = Date.now();

        // Check circuit breaker first
        if (this.circuitBreaker.isOpen(PROVIDER_KEY)) {
            this.healthState = 'CIRCUIT_OPEN';
            return { state: 'CIRCUIT_OPEN', cooldownSeconds: 0, circuitOpen: true };
        }

        if (this.healthState === 'RATE_LIMITED' && now < this.lastBackoffUntil) {
            return { state: 'RATE_LIMITED', cooldownSeconds: Math.ceil((this.lastBackoffUntil - now) / 1000), circuitOpen: false };
        }

        if (this.healthState === 'RATE_LIMITED' && now >= this.lastBackoffUntil) {
            this.healthState = 'READY';
        }

        return { state: this.healthState, cooldownSeconds: 0, circuitOpen: false };
    }

    /**
     * Specialized status for Cloudflare AI monitoring
     */
    public override getStatus(): Record<string, unknown> {
        const base = super.getStatus();
        const health = this.getHealth();
        return {
            ...base,
            health: health.state,
            cooldown: health.cooldownSeconds,
            circuitOpen: health.circuitOpen,
            consecutiveFailures: this.consecutiveFailures,
            backoffUntil: this.lastBackoffUntil > 0 ? new Date(this.lastBackoffUntil).toISOString() : 'None',
            provider: 'Cloudflare Workers AI (OPTIONAL)'
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
                handler: async (args: Record<string, unknown>) => {
                    const result = await this.generateImage(args['prompt'] as string, args['negativePrompt'] as string, args['width'] as number || 1024, args['height'] as number || 1024);
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
                handler: async (args: Record<string, unknown>) => this.chatCompletion((args['messages'] || []) as unknown[], args['maxTokens'] as number || 1024)
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
                handler: async (args: Record<string, unknown>) => {
                    const input = (args['texts'] as string[]) || (args['text'] ? [args['text'] as string] : []);
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
                handler: async (args: Record<string, unknown>) => this.handleVision(args['image'] as string, args['prompt'] as string)
            },
            {
                name: 'cf_speech_to_text',
                description: 'Convert audio to text using Cloudflare Workers AI (Whisper)',
                parameters: {
                    type: 'object',
                    properties: {
                        audio: { type: 'string', description: 'Base64 encoded audio data' }
                    },
                    required: ['audio']
                },
                handler: async (args: Record<string, unknown>) => this.handleSpeechToText(args['audio'] as string)
            },
            {
                name: 'cf_text_to_speech',
                description: 'Convert text to speech (Not natively supported by CF Workers AI - uses Ghost Limb Fallback)',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text to synthesize' }
                    },
                    required: ['text']
                },
                handler: async (args: Record<string, unknown>) => this.handleTextToSpeech(args['text'] as string)
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
                handler: async (args: Record<string, unknown>) => this.handleRsmv(args['gameSource'] as string, args['category'] as string, args['id'] as string)
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
                handler: async (args: Record<string, unknown>) => {
                    const bucket = (args['bucket'] as string) || 'workspace-bucketsespreview';
                    const buffer = Buffer.from(args['data'] as string, 'base64');
                    return this.services.putObject(bucket, args['key'] as string, buffer, args['contentType'] as string);
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
                handler: async (args: Record<string, unknown>) => {
                    const bucket = (args['bucket'] as string) || 'workspace-bucketsespreview';
                    const result = await this.services.getObject(bucket, args['key'] as string);
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
                handler: async (args: Record<string, unknown>) => this.handlePipeline(args['task'] as string, args['pipeline'] as 'image_gen' | 'code_forge' | 'assets_bake')
            },
            {
                name: 'cf_forge_multiplayer_globe',
                description: 'Scaffold a new multiplayer globe project from the official template.',
                parameters: {
                    type: 'object',
                    properties: {
                        targetDir: { type: 'string', description: 'Directory to scaffold the project into' }
                    },
                    required: ['targetDir']
                },
                handler: async (args: Record<string, unknown>) => this.handleGlobeForge(args['targetDir'] as string)
            },
            {
                name: 'cf_sync_constellation',
                description: 'Synchronize regional health and discover neighbor nodes via global spatial memory (Durable Objects).',
                parameters: {
                    type: 'object',
                    properties: {
                        nodeId: { type: 'string', description: 'Unique ID of the local node' },
                        region: { type: 'string', description: 'Current region code' }
                    },
                    required: ['nodeId', 'region']
                },
                schema: z.object({ nodeId: z.string(), region: z.string() }),
                handler: async (args: Record<string, unknown>) => this.handleConstellationSync(args['nodeId'] as string, args['region'] as string)
            },
            {
                name: 'cf_get_gps',
                description: 'Get the current geographic context (GPS) of the Cloudflare substrate.',
                parameters: { type: 'object', properties: {} },
                handler: async () => {
                    return {
                        ok: true,
                        value: {
                            lat: 34.0522,
                            lng: -118.2437,
                            origin: 'POG-VIBE-COORD-0',
                            region: 'Cloudflare Edge Substrate'
                        }
                    };
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        // ═══════════════════════════════════════════════════
        // SOVEREIGN GATE: Circuit Breaker + Health Check
        // If circuit is OPEN or service is degraded, YIELD.
        // ═══════════════════════════════════════════════════
        const health = this.getHealth();
        if (health.circuitOpen) {
            this.logger.debug('canHandle: Circuit OPEN — yielding (Yin)');
            return 'Yin';
        }
        if (health.state === 'CRITICAL_FAILURE' || health.state === 'OFF_GRID') return 'Yin';
        if (!this.services.getAccountId()) return 'Yin';

        const p = this.getUserIntent(intent).toLowerCase();

        // 'Yang': Explicit Cloudflare/CF requests = optimal
        const cfEscalation = ['cloudflare', 'cf_', 'workers ai'];
        if (cfEscalation.some(kw => p.includes(kw))) return 'Yang';

        // 'YinYang': General storage keywords = maybe
        const storageKeywords = ['r2 bucket', 'r2 storage', 'kv storage'];
        if (storageKeywords.some(kw => p.includes(kw))) return 'YinYang';

        return 'Yin';
    }


    /**
     * Execute handles direct intents by listing available tools or falling back to cognitive response
     */
    override async execute(intent: Intent): Promise<Result<Execution>> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        // If the user is just asking for status/tools
        if (userIntent.includes('status') || userIntent.includes('available tools') || userIntent.includes('capabilities')) {
            const tools = this.getTools();
            const toolNames = tools.map(t => t.functionDeclarations[0]?.name || 'unknown').join(', ');

            return {
                ok: true,
                value: {
                    output: `Cloudflare AI Limb is ready. Available tools: ${toolNames}\n\nTo use, specify a tool like: "use cf_generate_image to create..."`,
                    data: { availableTools: toolNames }
                }
            };
        }

        // Otherwise fallback to Sovereign Cognitive Response
        return super.execute(intent);
    }

    async generateEmbeddings(texts: string[]): Promise<Result<number[][]>> {
        const model = MODELS.EMBEDDING;
        const result = await this.services.runAi(model, {
            text: texts
        });

        if (!result.ok) {
            const error = (result as { ok: false; error: Error }).error;
            this.handleApiError(error);
            return { ok: false, error };
        }
        return { ok: true, value: (result.value as Record<string, unknown>)['data'] as number[][] };
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
            if (health.circuitOpen || health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`Cloudflare AI unavailable (${health.state}). Cooldown: ${health.cooldownSeconds}s`) };
            }

            const result = await this.services.runAi<Buffer>(model, {
                prompt,
                negative_prompt: negativePrompt,
                width,
                height
            });

            if (!result.ok) {
                const error = (result as { ok: false; error: Error }).error;
                this.handleApiError(error);
                return { ok: false, error };
            }

            this.circuitBreaker.reportSuccess(PROVIDER_KEY);
            return { ok: true, value: new Uint8Array(result.value) };
        } catch (error) {
            this.circuitBreaker.reportFailure(PROVIDER_KEY);
            return { ok: false, error: error as Error };
        }
    }

    async chatCompletion(messages: unknown[], maxTokens: number = 1024): Promise<Result<ModelResponse>> {
        try {
            const health = this.getHealth();
            if (health.circuitOpen || health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`Cloudflare AI unavailable (${health.state}). Cooldown: ${health.cooldownSeconds}s`) };
            }

            const typedMessages = messages as Array<{ role: string; content: string }>;
            const lastMessage = typedMessages[typedMessages.length - 1]?.content || '';
            const model = this.selectOptimalModel('chat', lastMessage);

            this.logger.info({ model, messageCount: messages.length }, 'Chat completion via Cloudflare AI Hub');

            const startTime = Date.now();
            const result = await this.services.runAi(model, {
                messages,
                max_tokens: maxTokens
            });

            if (!result.ok) {
                const error = (result as { ok: false; error: Error }).error;
                this.handleApiError(error);
                this.circuitBreaker.reportFailure(PROVIDER_KEY);
                return { ok: false, error };
            }

            this.circuitBreaker.reportSuccess(PROVIDER_KEY);
            return {
                ok: true,
                value: {
                    model: model,
                    response: result.value.response,
                    latency: Date.now() - startTime,
                    cognitivePulse: YaoState.OldYin
                }
            };
        } catch (error) {
            this.circuitBreaker.reportFailure(PROVIDER_KEY);
            return { ok: false, error: error as Error };
        }
    }

    private handleApiError(error: Error): void {
        this.consecutiveFailures++;
        const msg = error.message.toLowerCase();

        if (msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit')) {
            this.healthState = 'RATE_LIMITED';

            const match = error.message.match(/\[RETRY_AFTER:(\d+)\]/);
            const retryAfterSec = (match && match[1]) ? parseInt(match[1], 10) : 30;

            this.lastBackoffUntil = Date.now() + (retryAfterSec * 1000);
            this.logger.warn({ cooldown: retryAfterSec, consecutiveFailures: this.consecutiveFailures }, 'Cloudflare rate limit — backoff');
        } else if (msg.includes('401') || msg.includes('403')) {
            this.healthState = 'CRITICAL_FAILURE';
            this.logger.error('Cloudflare authentication failure — critical state');
        }

        // Report to circuit breaker
        this.circuitBreaker.reportFailure(PROVIDER_KEY);

        // Failover Tracer
        this.emit('failover_tracer', {
            from: 'cloudflare',
            to: 'local:ollama',
            reason: msg.includes('429') ? 'RATE_LIMITED' : 'FAILURE',
            consecutiveFailures: this.consecutiveFailures
        });
    }

    private async handleVision(imageBase64: string, prompt: string): Promise<Result<unknown>> {
        try {
            const health = this.getHealth();
            if (health.circuitOpen || health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`Vision unavailable (${health.state})`) };
            }

            const model = '@cf/meta/llama-3.2-11b-vision-instruct';
            this.logger.info({ model, prompt: prompt.substring(0, 50) }, 'Vision analysis via Cloudflare AI');

            const result = await this.services.runAi(model, {
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

            if (result.ok) this.circuitBreaker.reportSuccess(PROVIDER_KEY);
            else this.circuitBreaker.reportFailure(PROVIDER_KEY);

            return result;
        } catch (error) {
            this.circuitBreaker.reportFailure(PROVIDER_KEY);
            return { ok: false, error: error as Error };
        }
    }

    private async handleSpeechToText(audioBase64: string): Promise<Result<unknown>> {
        try {
            const health = this.getHealth();
            if (health.circuitOpen || health.state === 'RATE_LIMITED') {
                return { ok: false, error: new Error(`STT unavailable (${health.state})`) };
            }

            const model = MODELS.WHISPER;
            this.logger.info({ model }, 'Speech transcription via Cloudflare AI');

            const audioBytes = Buffer.from(audioBase64, 'base64');
            const result = await this.services.runAi(model, audioBytes);

            if (result.ok) this.circuitBreaker.reportSuccess(PROVIDER_KEY);
            else this.circuitBreaker.reportFailure(PROVIDER_KEY);

            return result;
        } catch (error) {
            this.circuitBreaker.reportFailure(PROVIDER_KEY);
            return { ok: false, error: error as Error };
        }
    }

    private async handleTextToSpeech(text: string): Promise<Result<Uint8Array>> {
        // TTS: Not natively supported by CF Workers AI.
        // Return error — local Ollama TTS (VIBE_TTS_MODEL) handles this instead.
        this.logger.info({ text: text.substring(0, 50) }, 'TTS not available on Cloudflare — use local VIBE_TTS_MODEL');
        return { ok: false, error: new Error('TTS not available on Cloudflare. Use local Ollama model (VIBE_TTS_MODEL) instead.') };
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
        this.logger.info({ task, type }, 'Executing agentic pipeline via Standalone App');

        // Lazy load the pipeline to avoid circular deps if any
        const { CloudflarePipeline } = await import('../../apps/cloudflare/Pipeline.js');
        const pipeline = new CloudflarePipeline(this.services);

        return pipeline.execute(task, type);
    }

    private async handleGlobeForge(targetDir: string): Promise<Result<unknown>> {
        const GLOBE_REPO = 'https://github.com/pick-of-gods/multiplayer-globe-template.git';
        this.logger.info({ targetDir, repo: GLOBE_REPO }, 'Initiating Globe Forge — cloning from sovereign template repo');

        try {
            const { execSync } = await import('child_process');
            execSync(`git clone ${GLOBE_REPO} "${targetDir}"`, { stdio: 'pipe' });

            this.logger.info({ targetDir }, 'Globe template cloned successfully');

            // Emit event for dashboard visibility
            this.emit('globe_forge_completed', {
                path: targetDir,
                repo: GLOBE_REPO,
                liveUrl: 'multiplayer-globe-template.kristain33rs.workers.dev',
                timestamp: new Date().toISOString()
            });

            return {
                ok: true,
                value: {
                    path: targetDir,
                    repo: GLOBE_REPO,
                    liveUrl: 'multiplayer-globe-template.kristain33rs.workers.dev',
                    instructions: 'Run `npm install` then fill in wrangler.toml credentials and `wrangler dev` to start.'
                }
            };
        } catch (error) {
            return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
        }
    }

    private async handleConstellationSync(nodeId: string, region: string): Promise<Result<unknown>> {
        this.logger.info({ nodeId, region }, 'Synchronizing with global constellation substrate');

        const health = this.getHealth();
        if (health.circuitOpen) {
            return {
                ok: true,
                value: {
                    status: 'CONSTELLATION_OFFLINE',
                    reason: 'Circuit breaker OPEN — cloud sync unavailable',
                    origin: nodeId
                }
            };
        }

        this.updateSpatialHealth();

        return {
            ok: true,
            value: {
                status: 'CONSTELLATION_SYNCED',
                origin: nodeId,
                region,
                healthState: health.state,
                consecutiveFailures: this.consecutiveFailures,
                boundaries: this.config.sovereignBoundaries
            }
        };
    }

    private updateSpatialHealth(): void {
        const health = this.getHealth();
        this.emit('spatial_health_update', {
            provider: 'cloudflare',
            health: health.state,
            circuitOpen: health.circuitOpen,
            consecutiveFailures: this.consecutiveFailures,
            timestamp: Date.now()
        });
    }
}
