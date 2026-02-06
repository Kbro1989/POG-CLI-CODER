/**
 * CloudflareLimb - Unified Cloudflare Workers AI Capabilities
 * 
 * Provides tools for:
 * - Text-to-Image (Stable Diffusion XL)
 * - LLM Chat Completion (Llama 3.1)
 * - Text Embeddings (BGE)
 * 
 * Based on official Cloudflare templates:
 * - text-to-image-template
 * - llm-chat-app-template
 */

import { NeuralLimb, Intent, Execution } from '../core/NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import pino from 'pino';

const logger = pino({ name: 'CloudflareLimb' });

// Cloudflare AI model IDs (from official templates)
const MODELS = {
    IMAGE: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    CHAT: '@cf/meta/llama-3.1-8b-instruct-fp8',
    EMBEDDING: '@cf/baai/bge-large-en-v1.5',
    WHISPER: '@cf/openai/whisper'
} as const;

interface CloudflareAIResponse<T = unknown> {
    success: boolean;
    errors?: Array<{ message: string }>;
    result?: T;
}

export class CloudflareLimb implements NeuralLimb {
    readonly id = 'cloudflare_ai';
    readonly type = 'cloud' as const;
    readonly capabilities = [
        'cf_generate_image',
        'cf_chat_completion',
        'cf_text_embedding'
    ];

    private readonly accountId: string;
    private readonly apiToken: string;
    private readonly baseUrl: string;

    constructor(config: VibeConfig) {
        this.accountId = process.env['CLOUDFLARE_ACCOUNT_ID'] || config.cloudflareAccountId || '';
        this.apiToken = process.env['CLOUDFLARE_API_TOKEN'] || config.cloudflareApiToken || '';
        this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
    }

    async canHandle(intent: Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();
        return (
            p.includes('cloudflare') ||
            p.includes('generate image') ||
            p.includes('create image') ||
            p.includes('embedding') ||
            p.includes('cf_')
        );
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        const p = intent.prompt.toLowerCase();

        if (p.includes('image') || p.includes('picture')) {
            const result = await this.generateImage(intent.prompt);
            if (result.ok) {
                return {
                    ok: true,
                    value: {
                        output: `Image generated (${result.value.byteLength} bytes)`,
                        data: { imageBuffer: result.value }
                    }
                };
            }
            return { ok: false, error: result.error };
        }

        return { ok: false, error: new Error('Use specific tools for Cloudflare AI') };
    }

    getTools() {
        return [
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
                }
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
                }
            }
        ];
    }

    async handleToolCall(name: string, args: Record<string, unknown>): Promise<Result<unknown>> {
        if (!this.accountId || !this.apiToken) {
            return { ok: false, error: new Error('Cloudflare credentials not configured') };
        }

        switch (name) {
            case 'cf_generate_image': {
                const prompt = args['prompt'] as string;
                const negativePrompt = args['negativePrompt'] as string | undefined;
                const width = (args['width'] as number) || 1024;
                const height = (args['height'] as number) || 1024;
                const result = await this.generateImage(prompt, negativePrompt, width, height);
                if (result.ok) {
                    return { ok: true, value: { imageBase64: Buffer.from(result.value).toString('base64') } };
                }
                return result;
            }

            case 'cf_chat_completion': {
                const messages = args['messages'] as Array<{ role: string; content: string }>;
                const maxTokens = (args['maxTokens'] as number) || 1024;
                const result = await this.chatCompletion(messages, maxTokens);
                return result;
            }

            case 'cf_text_embedding': {
                const text = args['text'] as string | undefined;
                const texts = args['texts'] as string[] | undefined;
                const input = texts || (text ? [text] : []);
                if (input.length === 0) {
                    return { ok: false, error: new Error('No text provided for embedding') };
                }
                const result = await this.generateEmbeddings(input);
                return result;
            }

            default:
                return { ok: false, error: new Error(`Unknown tool: ${name}`) };
        }
    }

    /**
     * Generate image using Stable Diffusion XL
     */
    private async generateImage(
        prompt: string,
        negativePrompt?: string,
        width = 1024,
        height = 1024
    ): Promise<Result<ArrayBuffer>> {
        try {
            logger.info({ prompt: prompt.substring(0, 50), width, height }, 'Generating image via Cloudflare AI');

            const response = await fetch(`${this.baseUrl}/${MODELS.IMAGE}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    negative_prompt: negativePrompt,
                    width,
                    height
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, 'Image generation failed');
                return { ok: false, error: new Error(`Cloudflare AI error: ${response.status}`) };
            }

            const imageBuffer = await response.arrayBuffer();
            logger.info({ bytes: imageBuffer.byteLength }, 'Image generated successfully');
            return { ok: true, value: imageBuffer };
        } catch (error: unknown) {
            logger.error({ error }, 'Image generation failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Chat completion using Llama 3.1
     */
    private async chatCompletion(
        messages: Array<{ role: string; content: string }>,
        maxTokens = 1024
    ): Promise<Result<{ response: string }>> {
        try {
            logger.info({ messageCount: messages.length }, 'Chat completion via Cloudflare AI');

            const response = await fetch(`${this.baseUrl}/${MODELS.CHAT}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, 'Chat completion failed');
                return { ok: false, error: new Error(`Cloudflare AI error: ${response.status}`) };
            }

            const result = await response.json() as CloudflareAIResponse<{ response: string }>;
            if (!result.success || !result.result) {
                return { ok: false, error: new Error(result.errors?.[0]?.message || 'Unknown error') };
            }

            logger.info({ responseLength: result.result.response.length }, 'Chat completed');
            return { ok: true, value: { response: result.result.response } };
        } catch (error: unknown) {
            logger.error({ error }, 'Chat completion failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Generate embeddings using BGE
     */
    private async generateEmbeddings(
        texts: string[]
    ): Promise<Result<{ embeddings: number[][] }>> {
        try {
            logger.info({ count: texts.length }, 'Generating embeddings via Cloudflare AI');

            const response = await fetch(`${this.baseUrl}/${MODELS.EMBEDDING}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: texts })
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, 'Embedding generation failed');
                return { ok: false, error: new Error(`Cloudflare AI error: ${response.status}`) };
            }

            const result = await response.json() as CloudflareAIResponse<{ data: Array<{ embedding: number[] }> }>;
            if (!result.success || !result.result?.data) {
                return { ok: false, error: new Error(result.errors?.[0]?.message || 'Unknown error') };
            }

            const embeddings = result.result.data.map(d => d.embedding);
            logger.info({ dimensions: embeddings[0]?.length }, 'Embeddings generated');
            return { ok: true, value: { embeddings } };
        } catch (error: unknown) {
            logger.error({ error }, 'Embedding generation failed');
            return { ok: false, error: error as Error };
        }
    }
}
