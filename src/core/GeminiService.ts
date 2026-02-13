import { GoogleGenAI, Tool, HarmCategory, HarmBlockThreshold } from '@google/genai';
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
    private readonly keyVault: KeyVault | undefined;
    private healthState: ServiceHealthState = 'READY';
    private lastBackoffUntil: number = 0;
    private readonly currentModel: string;

    constructor(config: GeminiConfig | string, keyVault?: KeyVault) {
        let apiKey: string;
        let finalConfig: GeminiConfig;
        let selectedModel: string;

        if (typeof config === 'string') {
            apiKey = config;
            finalConfig = { apiKey };
            selectedModel = 'gemini-2.0-flash';
        } else {
            apiKey = config.apiKey;
            finalConfig = config;
            selectedModel = config.modelName || 'gemini-2.0-flash';
        }

        // ------------------------------------------------------------------
        // Gemini CLI Auth Integration (Env Var Fallback)
        // ------------------------------------------------------------------
        if (!apiKey) {
            const envGemini = process.env['GEMINI_API_KEY'];
            const envGoogle = process.env['GOOGLE_API_KEY'];

            if (envGemini) {
                apiKey = envGemini;
                logger.info('Using GEMINI_API_KEY from environment');
            } else if (envGoogle) {
                apiKey = envGoogle;
                logger.info('Using GOOGLE_API_KEY from environment');
            } else if (keyVault) {
                const vaultKey = keyVault.getCurrentKey();
                if (vaultKey) {
                    apiKey = vaultKey;
                    logger.info('Using API key from KeyVault');
                }
            } else {
                // If we still don't have a key, existing behavior might fail later, or we warn here.
                // GoogleServices base class might accept empty key if it relies on ADC, 
                // but Gemini usually requires an API key. 
                logger.warn('No API key provided or found in environment/vault. Gemini calls may fail.');
            }
        }

        // Ensure the config object has the resolved key
        finalConfig.apiKey = apiKey;

        super(finalConfig);

        this.currentModel = selectedModel;
        this.keyVault = keyVault;

        this.genAI = new GoogleGenAI({
            apiKey: this.config.apiKey,
            ...(typeof config !== 'string' && config.customHeaders ? { customHeaders: config.customHeaders } : {}),
            ...(typeof config !== 'string' && config.apiEndpoint ? { apiEndpoint: config.apiEndpoint } : {})
        } as { apiKey: string; customHeaders?: Record<string, string>; apiEndpoint?: string });

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

            const response = await this.genAI.models.generateContent({
                model: targetModel,
                contents,
                config: {
                    ...(genTools ? { tools: genTools } : {}),
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                    ]
                }
            });

            // 3. Robust candidate validation
            const candidates = response.candidates || [];
            if (candidates.length === 0) {
                throw new Error('EMPTY_RESPONSE: Gemini returned no candidates');
            }

            const candidate = candidates[0];
            if (!candidate) {
                throw new Error('MALFORMED_RESPONSE: Candidate is undefined');
            }
            const finishReason = candidate.finishReason;

            if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'OTHER') {
                throw new Error(`BLOCKED_RESPONSE: ${finishReason}`);
            }

            const content = candidate.content;
            if (!content || !content.parts || content.parts.length === 0) {
                throw new Error('MALFORMED_RESPONSE: No content parts');
            }

            const text = response.text || content.parts?.[0]?.text || '';

            const rawParts = content.parts || [];
            const functionCalls: FunctionCall[] = rawParts
                .map((p: any) => {
                    if (p.functionCall) {
                        return {
                            name: p.functionCall.name as string,
                            args: p.functionCall.args as Record<string, unknown>
                        };
                    }
                    return null;
                })
                .filter((p: FunctionCall | null): p is FunctionCall => p !== null);

            if (this.keyVault) {
                this.keyVault.resetFailCount();
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
        let lastError: Error | unknown;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await fn();
                if (result.ok) return result;

                // If the error is quota/auth, we might still want to handle it via rotateKey
                // but let's see if we should retry first
                lastError = result.error;
            } catch (error: unknown) {
                lastError = error;
                const { isQuota, isAuth, message } = this.classifyError(error);

                if (isQuota && model !== 'gemini-2.0-flash-lite') {
                    logger.warn({ model }, 'Quota hit, falling back to Flash Lite for retry attempt');
                    return (this.generateContent(prompt, 'gemini-2.0-flash-lite', tools) as Promise<Result<T>>);
                }

                if ((isQuota || isAuth) && this.keyVault) {
                    const rotated = this.keyVault.rotateKey(isQuota ? 'rate_limit' : 'auth_error');
                    if (rotated) {
                        const newKey = this.keyVault.getCurrentKey();
                        if (newKey) {
                            logger.info('Retrying with rotated key');
                            this.genAI = new GoogleGenAI({ apiKey: newKey });
                            // Reset model connection
                            return (this.generateContent(prompt, model, tools) as Promise<Result<T>>);
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

        const message = lastError instanceof Error ? lastError.message : 'Unknown Gemini error';
        logger.error({
            error: message,
            model,
            stack: lastError instanceof Error ? lastError.stack : undefined
        }, 'Gemini generation failed after retries');
        return { ok: false, error: (lastError instanceof Error ? lastError : new Error(message)) };
    }

    private isRetryable(error: unknown): boolean {
        const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
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
            const responseStream = await this.genAI.models.generateContentStream({
                model: targetModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            async function* streamGenerator() {
                for await (const chunk of responseStream) {
                    const text = chunk.text || '';
                    if (text) yield text;
                }
            }

            if (this.keyVault) {
                this.keyVault.resetFailCount();
            }

            return { ok: true, value: streamGenerator() };
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error({ error: err.message, model: targetModel }, 'Gemini stream failed');
            return { ok: false, error: err };
        }
    }

    async embed(text: string): Promise<Result<Float32Array>> {
        try {
            const result = await this.genAI.models.embedContent({
                model: 'text-embedding-004',
                contents: [{ role: 'user', parts: [{ text }] }]
            });
            const embedding = result.embeddings?.[0];

            if (!embedding || !embedding.values) {
                throw new Error('No embedding returned');
            }

            return { ok: true, value: new Float32Array(embedding.values) };
        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error({ error: err.message }, 'Embedding generation failed');
            return { ok: false, error: err };
        }
    }
}

