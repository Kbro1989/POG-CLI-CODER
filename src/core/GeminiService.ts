import { GoogleGenAI, Tool } from '@google/genai';
import pino from 'pino';
import { Result, ModelResponse, FunctionCall } from './models.js';
import { KeyVault } from '../utils/KeyVault.js';

const logger = pino({
    name: 'GeminiService',
    base: { hostname: 'POG-VIBE' }
});

export interface GeminiConfig {
    apiKey: string;
    useVertexAI?: boolean;
    apiEndpoint?: string;
    customHeaders?: Record<string, string>;
    modelName?: string;
}

export type ServiceHealthState = 'READY' | 'RATE_LIMITED' | 'CRITICAL_FAILURE';

export class GeminiService {
    private genAI: GoogleGenAI;
    private keyVault?: KeyVault;
    private config: GeminiConfig;
    private healthState: ServiceHealthState = 'READY';
    private lastBackoffUntil: number = 0;

    constructor(config: GeminiConfig | string, keyVault?: KeyVault) {
        if (typeof config === 'string') {
            this.config = { apiKey: config, modelName: 'gemini-2.0-flash' };
        } else {
            this.config = config;
        }

        if (keyVault) {
            this.keyVault = keyVault;
        }

        this.genAI = new GoogleGenAI({
            apiKey: this.config.apiKey,
            ...(this.config.customHeaders ? { customHeaders: this.config.customHeaders } : {}),
            ...(this.config.apiEndpoint ? { apiEndpoint: this.config.apiEndpoint } : {})
        } as any); // Type cast for extended SDK options

        // Register health provider
        import('./HealthRegistry.js').then(m => {
            m.HealthRegistry.getInstance().registerProvider('gemini', () => this.getHealth());
        });
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

    async generateContent(
        prompt: string,
        modelOverride?: string,
        tools?: Tool[]
    ): Promise<Result<ModelResponse>> {
        const health = this.getHealth();
        if (health.state === 'RATE_LIMITED') {
            return { ok: false, error: new Error(`Gemini API is rate limited. Cooldown: ${health.cooldownSeconds}s`) };
        }

        const startTime = Date.now();
        const modelName = modelOverride || this.config.modelName || 'gemini-2.0-flash';

        try {
            // Robust request construction mirroring gemini-cli contentGenerator pattern
            const request: any = {
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                tools: (tools && tools.length > 0) ? tools : undefined
            };

            const response = await (this.genAI.models as any).generateContent(request);

            // Robust multi-candidate parsing logic
            const candidate = response.candidates?.[0];
            const content = candidate?.content;
            const text = response.text || content?.parts?.[0]?.text || '';

            const rawCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
            const functionCalls: FunctionCall[] = rawCalls.map((fc: any) => ({
                name: fc.name,
                args: (fc.args as Record<string, unknown>) || {}
            }));

            // Reset fail count on success
            if (this.keyVault) {
                this.keyVault.resetFailCount();
            }
            this.healthState = 'READY';

            const modelResponse: ModelResponse = {
                model: modelName,
                response: text,
                latency: Date.now() - startTime,
                ...(functionCalls.length > 0 ? { functionCalls } : {})
            };

            return { ok: true, value: modelResponse };
        } catch (error: any) {
            const isRateLimit = error.message?.includes('429') || error.message?.includes('quota');
            const isAuthError = error.message?.includes('401') || error.message?.includes('403');

            if ((isRateLimit || isAuthError) && this.keyVault) {
                const reason = isRateLimit ? 'rate_limit' : 'auth_error';
                logger.warn({ error: error.message, reason }, 'API error, attempting key rotation');

                const rotated = this.keyVault.rotateKey(reason);
                if (rotated) {
                    const newKey = this.keyVault.getCurrentKey();
                    if (newKey) {
                        this.config.apiKey = newKey;
                        this.genAI = new GoogleGenAI({ apiKey: newKey } as any);
                        logger.info('Retrying with rotated key');
                        return this.generateContent(prompt, modelOverride, tools);
                    }
                }
            }

            if (isRateLimit) {
                this.healthState = 'RATE_LIMITED';
                // Extract retry-after if possible, else 60s default for Gemini
                this.lastBackoffUntil = Date.now() + 60000;
                logger.error({ model: modelName, cooldown: 60 }, 'Gemini rate limit hit - entering cooldown');
            } else if (isAuthError) {
                this.healthState = 'CRITICAL_FAILURE';
            }

            logger.error({ error, model: modelName }, 'Gemini generation failed');
            return { ok: false, error: error as Error };
        }
    }

    async generateContentStream(prompt: string, modelOverride?: string): Promise<Result<AsyncGenerator<string, void, unknown>>> {
        const health = this.getHealth();
        if (health.state !== 'READY') return { ok: false, error: new Error('Gemini not ready') };

        const modelName = modelOverride || this.config.modelName || 'gemini-2.0-flash';
        try {
            const stream = await this.genAI.models.generateContentStream({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            async function* streamGenerator() {
                for await (const chunk of stream) {
                    const text = chunk.text;
                    if (text) yield text;
                }
            }

            if (this.keyVault) {
                this.keyVault.resetFailCount();
            }

            return { ok: true, value: streamGenerator() };
        } catch (error: any) {
            logger.error({ error, model: modelName }, 'Gemini stream failed');
            return { ok: false, error: error as Error };
        }
    }

    async embed(text: string): Promise<Result<Float32Array>> {
        try {
            const result = await this.genAI.models.embedContent({
                model: 'gemini-embedding-001',
                contents: [{ role: 'user', parts: [{ text }] }]
            });
            const embedding = (result as any).embeddings?.[0] || (result as any).embedding;

            if (!embedding || !embedding.values) {
                throw new Error('No embedding returned');
            }

            return { ok: true, value: new Float32Array(embedding.values) };
        } catch (error: any) {
            logger.error({ error }, 'Embedding generation failed');
            return { ok: false, error: error as Error };
        }
    }
}
