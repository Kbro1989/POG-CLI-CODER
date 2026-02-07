import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';
import { Tool } from '@google/genai';
import {
    Result,
    ModelResponse,
    VibeConfig,
    ModelAbility as MA
} from './models.js';
import { GeminiService } from './GeminiService.js';
import type { FreeModelRouter } from './Router.js';

const execAsync = promisify(exec);

export class ModelExecutor {
    private readonly logger: pino.Logger;

    constructor(
        private readonly config: VibeConfig,
        private readonly geminiService: GeminiService | undefined,
        private router?: FreeModelRouter
    ) {
        this.logger = pino({
            name: 'ModelExecutor',
            base: { hostname: this.config.agentName }
        });
    }

    setRouter(router: FreeModelRouter) {
        this.router = router;
    }

    async callModel(model: string, prompt: string, tools?: Tool[]): Promise<Result<ModelResponse>> {
        const startTime = Date.now();

        // 1. Explicit Cloud Redirects (Prefix-based)
        if (model.startsWith('gemini:')) {
            const geminiModel = model.replace('gemini:', '');
            return this.callGeminiFallback(prompt, geminiModel, tools);
        }

        if (model.startsWith('cloudflare:')) {
            const cfModel = model.replace('cloudflare:', '');
            return this.callCloudflareGateway(prompt, cfModel, startTime);
        }

        const STORAGE_THRESHOLD_GB = 5;
        const CONTEXT_THRESHOLD_TOKENS = 32000;

        // 2. Resource Health Checks (Local Stability)
        const storageCheck = await this.checkStorageHealth(STORAGE_THRESHOLD_GB);
        if (!storageCheck.ok) {
            this.logger.warn({ error: storageCheck.error, action: 'forcing_cloud_fallback' }, 'Local storage critical');
            return this.callGeminiFallback(prompt, undefined, tools);
        }

        // 3. Context Overflow Detection
        const estimatedTokens = prompt.length / 4;
        if (estimatedTokens > CONTEXT_THRESHOLD_TOKENS) {
            this.logger.info({ tokens: estimatedTokens, action: 'forcing_cloud_fallback' }, 'Prompt exceeds local context');
            return this.callGeminiFallback(prompt, 'gemini-2.0-flash', tools);
        }

        // 4. Execution Chain: Local -> Cloudflare -> Gemini
        try {
            const response = await this.callOllama(model, prompt);
            return { ok: true, value: { model, response, latency: Date.now() - startTime } };
        } catch (ollamaError) {
            this.logger.warn({ model, error: ollamaError }, 'Ollama execution failed, attempting Cloudflare AI Gateway');

            // Try Cloudflare as Primary Backup
            const cfResult = await this.callCloudflareGateway(prompt, model, startTime);
            if (cfResult.ok) return cfResult;

            // Final fallback to Gemini
            this.logger.warn({ model, error: cfResult.error }, 'Cloudflare fallback failed, attempting Gemini');
            return this.callGeminiFallback(prompt, undefined, tools);
        }
    }

    /**
     * Generic Cloudflare AI call (Used for Media/Image Gen)
     */
    async callCloudflareAI(model: string, input: any, isBinaryInput = false): Promise<Result<any>> {
        const gatewayUrl = this.config.cloudflareGatewayUrl;
        if (!gatewayUrl) {
            return { ok: false, error: new Error('Cloudflare AI Gateway URL not configured') };
        }

        const startTime = Date.now();
        try {
            const finalUrl = gatewayUrl.endsWith('/') ? `${gatewayUrl}${model}` : `${gatewayUrl}/${model}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${process.env['CLOUDFLARE_API_KEY'] || ''}`
            };

            if (!isBinaryInput) {
                headers['Content-Type'] = 'application/json';
            } else {
                headers['Content-Type'] = 'application/octet-stream';
            }

            const response = await fetch(finalUrl, {
                method: 'POST',
                headers,
                body: isBinaryInput ? input : JSON.stringify(input)
            });

            const latency = Date.now() - startTime;
            this.logger.debug({ model, latency }, 'Cloudflare AI call completed');

            if (!response.ok) {
                const errorBody = await response.text();
                return { ok: false, error: new Error(`Cloudflare AI failed (${response.status}): ${errorBody}`) };
            }

            // Image generation usually returns binary or base64
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const data = await response.json();
                return { ok: true, value: data };
            } else {
                // Return as buffer/blob for media
                const buffer = await response.arrayBuffer();
                return { ok: true, value: Buffer.from(buffer) };
            }
        } catch (error: any) {
            return { ok: false, error };
        }
    }

    async transcribeAudio(audioBuffer: Buffer): Promise<Result<string>> {
        const model = this.router ? this.router.routeByAbility(MA.Transcription) : "@cf/openai/whisper";
        this.logger.info({ model }, 'Calling Cloudflare Whisper for transcription');

        const result = await this.callCloudflareAI(model, audioBuffer, true);
        if (!result.ok) return result;

        const data = result.value;
        if (data.result && data.result.text) {
            return { ok: true, value: data.result.text };
        }

        return { ok: true, value: data.text || JSON.stringify(data) };
    }

    private async callCloudflareGateway(
        prompt: string,
        model: string,
        startTime: number
    ): Promise<Result<ModelResponse>> {
        const gatewayUrl = this.config.cloudflareGatewayUrl;
        if (!gatewayUrl) {
            return { ok: false, error: new Error('Cloudflare AI Gateway URL not configured') };
        }

        try {
            // Use the passed model if it looks like a Cloudflare ID (starts with @cf/),
            // otherwise map models to Cloudflare equivalents
            let cfModel = model.startsWith('@cf/') ? model : "@cf/meta/llama-3.1-8b-instruct";

            if (!model.startsWith('@cf/')) {
                if (model.includes('qwen') || model.includes('coder')) {
                    cfModel = "@cf/meta/llama-3.1-8b-instruct"; // Best coding fallback on CF
                } else if (model.includes('vision')) {
                    cfModel = "@cf/llmvic/llama-3-vision-8b-instruct";
                }
            }

            const finalUrl = gatewayUrl.endsWith('/') ? `${gatewayUrl}${cfModel}` : `${gatewayUrl}/${cfModel}`;
            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env['CLOUDFLARE_API_KEY'] || ''}`
                },
                body: JSON.stringify({
                    model: cfModel,
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Cloudflare Gateway failed (${response.status}): ${errorText}`);
            }

            const data = await response.json() as any;
            return {
                ok: true,
                value: {
                    model: `cloudflare:${cfModel}`,
                    response: data.response || data.result?.response || JSON.stringify(data),
                    latency: Date.now() - startTime
                }
            };
        } catch (error) {
            this.logger.error({ error }, 'Cloudflare AI Gateway fallback failed critically');
            return { ok: false, error: error as Error };
        }
    }

    private async callGeminiFallback(
        prompt: string,
        modelOverride?: string,
        tools?: Tool[]
    ): Promise<Result<ModelResponse>> {
        const startTime = Date.now();
        try {
            if (!this.geminiService) {
                throw new Error('Gemini Service is not initialized (check GOOGLE_API_KEY)');
            }

            const result = await this.geminiService.generateContent(prompt, modelOverride, tools);
            if (!result.ok) throw result.error;

            return result;
        } catch (geminiError) {
            this.logger.warn({ geminiError }, 'Gemini execution failed, attempting Cloudflare AI Gateway');
            return this.callCloudflareGateway(prompt, modelOverride || 'gemini-2.0-flash', startTime);
        }
    }

    private async callOllama(model: string, prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const ollamaPath = this.config.errorTrackerModelPath || 'D:\\ollama-models';
            this.logger.info({ model, path: ollamaPath }, 'Invoking Ollama CLI with custom model path');

            const child = spawn('ollama', ['run', model, prompt], {
                env: {
                    ...process.env,
                    OLLAMA_MODELS: ollamaPath
                },
                shell: true
            });

            const timeout = setTimeout(() => {
                child.kill();
                reject(new Error(`Ollama execution timed out after 30s for model: ${model}`));
            }, 30000);

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(`Ollama CLI failed with code ${code}: ${stderr}`));
                }
            });

            child.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    private async checkStorageHealth(thresholdGB: number): Promise<Result<number>> {
        try {
            // Windows specific command
            const { stdout } = await execAsync('wmic logicaldisk where "DeviceID=\'C:\'" get FreeSpace');
            const lines = stdout.trim().split('\n');
            const freeBytesStr = lines[1]?.trim() || '';
            const freeBytes = parseInt(freeBytesStr, 10);

            if (isNaN(freeBytes)) {
                this.logger.error({ stdout }, 'Failed to parse free space from WMIC');
                return { ok: true, value: 1024 };
            }

            const freeGB = freeBytes / 1024 / 1024 / 1024;
            if (freeGB < thresholdGB) {
                return { ok: false, error: new Error(`Low Disk Space: ${freeGB.toFixed(2)}GB`) };
            }
            return { ok: true, value: freeGB };
        } catch (error) {
            this.logger.error({ error }, 'Storage health check failed critically');
            return { ok: true, value: 1024 };
        }
    }
}
