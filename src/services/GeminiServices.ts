import { GoogleGenAI, Tool } from '@google/genai';
import pino from 'pino';
import { Result, ModelResponse, FunctionCall } from '../core/models.js';
import { KeyVault } from '../utils/KeyVault.js';
import { GoogleServices } from './GoogleServices.js';

const logger = pino({
    name: 'GeminiServices',
    base: { hostname: 'POG-VIBE' }
});

export interface GeminiConfig {
    apiKey: string;
    modelName?: string;
    useVertexAI?: boolean;
}

/**
 * GeminiServices - "Packed" Gemini Intelligence Layer
 * Optimized for Free Tier First users.
 */
export class GeminiServices extends GoogleServices {
    private genAI: GoogleGenAI;
    private keyVault: KeyVault | undefined;
    private currentModel: string;

    constructor(config: GeminiConfig, keyVault?: KeyVault) {
        super({ apiKey: config.apiKey });
        this.keyVault = keyVault;
        this.currentModel = config.modelName || 'gemini-2.0-flash';
        this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey } as any);
    }

    /**
     * Generate content with automated free-tier routing and failover
     */
    async generateContent(
        prompt: string,
        modelOverride?: string,
        tools?: Tool[]
    ): Promise<Result<ModelResponse>> {
        const startTime = Date.now();
        const targetModel = modelOverride || this.currentModel;

        try {
            const request: any = {
                model: targetModel,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                tools: (tools && tools.length > 0) ? tools : undefined
            };

            const response = await (this.genAI as any).models.generateContent(request);

            // Multi-candidate parsing
            const candidate = (response as any).candidates?.[0];
            const content = (candidate as any)?.content;
            const text = (response as any).text || (content as any)?.parts?.[0]?.text || '';

            // Extract function calls if any
            const rawCalls = (content as any)?.parts?.filter((p: any) => p.functionCall).map((p: any) => p.functionCall) || [];
            const functionCalls: FunctionCall[] = rawCalls.map((fc: any) => ({
                name: (fc as any).name,
                args: ((fc as any).args as Record<string, unknown>) || {}
            }));

            if (this.keyVault) {
                this.keyVault.resetFailCount();
            }

            return {
                ok: true,
                value: {
                    model: targetModel,
                    response: text,
                    latency: Date.now() - startTime,
                    ...(functionCalls.length > 0 ? { functionCalls } : {})
                }
            };
        } catch (error: any) {
            const { isQuota, isAuth, message } = this.classifyError(error);

            // Handle Free Tier Failover
            if (isQuota && targetModel !== 'gemini-2.0-flash-lite') {
                logger.warn({ model: targetModel }, 'Quota hit, falling back to Gemini Flash Lite (Free Tier Optimized)');
                return this.generateContent(prompt, 'gemini-2.0-flash-lite', tools);
            }

            // Key Rotation logic
            if ((isQuota || isAuth) && this.keyVault) {
                const rotated = this.keyVault.rotateKey(isQuota ? 'rate_limit' : 'auth_error');
                if (rotated) {
                    const newKey = this.keyVault.getCurrentKey();
                    if (newKey) {
                        logger.info('Retrying with rotated key');
                        this.genAI = new GoogleGenAI({ apiKey: newKey } as any);
                        return this.generateContent(prompt, modelOverride, tools);
                    }
                }
            }

            logger.error({ error: message, model: targetModel }, 'Gemini generation failed');
            return { ok: false, error: error as Error };
        }
    }

    async generateContentStream(prompt: string, modelOverride?: string): Promise<Result<AsyncGenerator<string, void, unknown>>> {
        const modelName = modelOverride || this.currentModel;
        try {
            const stream = await (this.genAI as any).models.generateContentStream({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            async function* streamGenerator() {
                for await (const chunk of (stream as any)) {
                    const text = (chunk as any).text;
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
            const result = await (this.genAI as any).models.embedContent({
                model: 'text-embedding-004',
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
