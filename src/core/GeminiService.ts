import { GoogleGenAI, Tool } from '@google/genai';
import pino from 'pino';
import { Result, ModelResponse, FunctionCall } from './models.js';
import { KeyVault } from '../utils/KeyVault.js';
import { HealthRegistry } from './HealthRegistry.js';

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
        } as any); // Cast permitted for internal SDK bridge properties

        // Register health provider
        HealthRegistry.getInstance().registerProvider('gemini', () => this.getHealth());
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
            const request = {
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                tools: (tools && tools.length > 0) ? tools : undefined
            } as any;

            const model = (this.genAI as any).getGenerativeModel({ model: modelName });
            const result = await model.generateContent({
                contents: request.contents,
                tools: request.tools
            });

            const response = result.response as any;

            // Robust multi-candidate parsing logic
            const candidate = (response as any)['candidates']?.[0];
            const content = candidate?.['content'];
            const text = (response as any)['text'] || content?.['parts']?.[0]?.['text'] || '';

            const rawParts = candidate?.['content']?.['parts'] || [];
            const functionCalls: FunctionCall[] = rawParts
                .filter((p: any) => p['functionCall'])
                .map((p: any) => ({
                    name: p['functionCall']!.name,
                    args: p['functionCall']!.args
                }));

            // Reset fail count on success
            if (this.keyVault) {
                (this.keyVault as any).resetFailCount();
            }
            this.healthState = 'READY';

            const modelResponse: ModelResponse = {
                model: modelName,
                response: text,
                latency: Date.now() - startTime,
                ...(functionCalls.length > 0 ? { functionCalls } : {})
            };

            return { ok: true, value: modelResponse };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota');
            const isAuthError = errorMessage.includes('401') || errorMessage.includes('403');

            if ((isRateLimit || isAuthError) && this.keyVault) {
                const reason = isRateLimit ? 'rate_limit' : 'auth_error';
                logger.warn({ error: errorMessage, reason }, 'API error, attempting key rotation');

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
            const model = (this.genAI as any).getGenerativeModel({ model: modelName });
            const result = await model.generateContentStream({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            async function* streamGenerator() {
                for await (const chunk of result.stream) {
                    const text = chunk.text();
                    if (text) yield text;
                }
            }

            if (this.keyVault) {
                this.keyVault.resetFailCount();
            }

            return { ok: true, value: streamGenerator() };
        } catch (error) {
            logger.error({ error, model: modelName }, 'Gemini stream failed');
            return { ok: false, error: error as Error };
        }
    }

    async embed(text: string): Promise<Result<Float32Array>> {
        try {
            const model = (this.genAI as any).getGenerativeModel({ model: 'text-embedding-004' });
            const result = await model.embedContent(text);
            const embedding = result.embedding;

            if (!embedding || !embedding.values) {
                throw new Error('No embedding returned');
            }

            return { ok: true, value: new Float32Array(embedding.values) };
        } catch (error) {
            logger.error({ error }, 'Embedding generation failed');
            return { ok: false, error: error as Error };
        }
    }
}

