import { GoogleGenAI, Tool } from '@google/genai';
import pino from 'pino';
import { Result, ModelResponse, FunctionCall } from './models.js';
import { KeyVault } from '../utils/KeyVault.js';
import { HealthRegistry } from './HealthRegistry.js';
import { GoogleServices } from '../services/GoogleServices.js';

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

/**
 * GeminiService - Unified Intelligence Layer (Sovereign Substrate)
 * 
 * Incorporates automated failover, key rotation, and sensory integration.
 */
export class GeminiService extends GoogleServices {
    private genAI: GoogleGenAI;
    private keyVault: KeyVault | undefined;
    private healthState: ServiceHealthState = 'READY';
    private lastBackoffUntil: number = 0;
    private currentModel: string;

    constructor(config: GeminiConfig | string, keyVault?: KeyVault) {
        if (typeof config === 'string') {
            super({ apiKey: config });
            this.currentModel = 'gemini-2.0-flash';
        } else {
            super({ apiKey: config.apiKey });
            this.currentModel = config.modelName || 'gemini-2.0-flash';
        }

        this.keyVault = keyVault;

        this.genAI = new GoogleGenAI({
            apiKey: this.config.apiKey,
            ...(typeof config !== 'string' && config.customHeaders ? { customHeaders: config.customHeaders } : {}),
            ...(typeof config !== 'string' && config.apiEndpoint ? { apiEndpoint: config.apiEndpoint } : {})
        } as any);

        // Register health provider
        HealthRegistry.getInstance().registerProvider('gemini', () => this.getHealth());
    }

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

        return this.retryWithBackoff<ModelResponse>(async () => {
            const startTime = Date.now();
            const targetModel = modelOverride || this.currentModel;

            // 1. Prepare contents
            const contents = [{ role: 'user', parts: [{ text: prompt }] }];

            // 2. Prepare tools
            const genTools = (tools && tools.length > 0) ? tools : undefined;

            const model = (this.genAI as any).getGenerativeModel({
                model: targetModel,
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            });

            const result = await model.generateContent({
                contents,
                tools: genTools
            } as any);

            const response = result.response as any;

            // 3. Robust candidate validation
            const candidates = response['candidates'] || [];
            if (candidates.length === 0) {
                // If it's a 200 OK but no candidates, it might be a block or transient
                throw new Error('EMPTY_RESPONSE: Gemini returned no candidates');
            }

            const candidate = candidates[0];
            const finishReason = candidate['finishReason'];

            if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'OTHER') {
                throw new Error(`BLOCKED_RESPONSE: ${finishReason}`);
            }

            const content = candidate['content'];
            if (!content || !content['parts'] || content['parts'].length === 0) {
                throw new Error('MALFORMED_RESPONSE: No content parts');
            }

            const text = (response as any)['text']?.() || content['parts']?.[0]?.['text'] || '';

            const rawParts = content['parts'] || [];
            const functionCalls: FunctionCall[] = rawParts
                .filter((p: any) => p['functionCall'])
                .map((p: any) => ({
                    name: p['functionCall']!.name,
                    args: p['functionCall']!.args
                }));

            if (this.keyVault) {
                (this.keyVault as any).resetFailCount();
            }
            this.healthState = 'READY';

            const modelResponse: ModelResponse = {
                model: targetModel,
                response: text,
                latency: Date.now() - startTime,
                ...(functionCalls.length > 0 ? { functionCalls } : {})
            };

            return { ok: true, value: modelResponse };
        }, modelOverride || this.currentModel, prompt, tools);
    }

    private async retryWithBackoff<T>(
        fn: () => Promise<Result<T>>,
        model: string,
        prompt: string,
        tools?: Tool[],
        maxAttempts = 3,
        initialDelay = 1000
    ): Promise<Result<T>> {
        let lastError: any;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await fn();
                if (result.ok) return result;

                // If the error is quota/auth, we might still want to handle it via rotateKey
                // but let's see if we should retry first
                lastError = result.error;
            } catch (error: any) {
                lastError = error;
                const { isQuota, isAuth, message } = this.classifyError(error);

                if (isQuota && model !== 'gemini-2.0-flash-lite') {
                    logger.warn({ model }, 'Quota hit, falling back to Flash Lite for retry attempt');
                    return this.generateContent(prompt, 'gemini-2.0-flash-lite', tools) as any;
                }

                if ((isQuota || isAuth) && this.keyVault) {
                    const rotated = this.keyVault.rotateKey(isQuota ? 'rate_limit' : 'auth_error');
                    if (rotated) {
                        const newKey = this.keyVault.getCurrentKey();
                        if (newKey) {
                            logger.info('Retrying with rotated key');
                            this.genAI = new GoogleGenAI({ apiKey: newKey } as any);
                            // Reset model connection
                            return this.generateContent(prompt, model, tools) as any;
                        }
                    }
                }

                if (!this.isRetryable(error) || attempt === maxAttempts) {
                    if (isQuota) {
                        this.healthState = 'RATE_LIMITED';
                        this.lastBackoffUntil = Date.now() + 60000;
                        logger.error({ model, cooldown: 60 }, 'Gemini rate limit hit - entering cooldown');
                    } else if (isAuth) {
                        this.healthState = 'CRITICAL_FAILURE';
                    }
                    break;
                }

                const delay = initialDelay * Math.pow(2, attempt - 1);
                logger.warn({ attempt, delay, error: message }, 'Retrying Gemini request after backoff');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        const message = lastError?.message || 'Unknown Gemini error';
        logger.error({
            error: message,
            model,
            stack: lastError?.stack
        }, 'Gemini generation failed after retries');
        return { ok: false, error: (lastError instanceof Error ? lastError : new Error(message)) };
    }

    private isRetryable(error: any): boolean {
        const message = error.message?.toLowerCase() || '';
        return message.includes('empty_response') ||
            message.includes('malformed_response') ||
            message.includes('500') ||
            message.includes('503') ||
            message.includes('deadline') ||
            message.includes('econnreset');
    }

    async generateContentStream(prompt: string, modelOverride?: string): Promise<Result<AsyncGenerator<string, void, unknown>>> {
        const health = this.getHealth();
        if (health.state !== 'READY') return { ok: false, error: new Error('Gemini not ready') };

        const targetModel = modelOverride || this.currentModel;
        try {
            const model = (this.genAI as any).getGenerativeModel({ model: targetModel });
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
            logger.error({ error, model: targetModel }, 'Gemini stream failed');
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

