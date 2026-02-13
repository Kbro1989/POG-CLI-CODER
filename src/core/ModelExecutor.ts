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
        if (storageCheck.ok === false) {
            this.logger.warn({ error: (storageCheck as { error: Error }).error, action: 'forcing_cloud_fallback' }, 'Local storage critical');
            return this.callGeminiFallback(prompt, undefined, tools);
        }

        // 3. Context Overflow Detection
        const estimatedTokens = prompt.length / 4;
        if (estimatedTokens > CONTEXT_THRESHOLD_TOKENS) {
            this.logger.info({ tokens: estimatedTokens, action: 'forcing_cloud_fallback' }, 'Prompt exceeds local context');
            return this.callGeminiFallback(prompt, 'gemini-2.0-flash', tools);
        }

        // 4. Execution Chain: Local -> Cloudflare -> Gemini -> Sovereign CLI -> Ghost Limb
        const tiers: import('./models.js').CascadeTier[] = [];
        let generationMode: 'AI' | 'CLI-Fallback' | 'Ghost-Limb' = 'AI';
        let failureCount = 0;

        try {
            const response = await this.callOllama(model, prompt);
            tiers.push({ name: 'Local Ollama', status: 'success', timestamp: Date.now() });
            return {
                ok: true,
                value: {
                    model,
                    response,
                    latency: Date.now() - startTime,
                    provenance: { tiers, finalModel: model, latency: Date.now() - startTime, generationMode, failureCount }
                }
            };
        } catch (ollamaError) {
            const errorMessage = ollamaError instanceof Error ? ollamaError.message : String(ollamaError);
            tiers.push({ name: 'Local Ollama', status: 'failure', error: errorMessage, timestamp: Date.now() });
            failureCount++;

            // Try Cloudflare as Primary Backup
            const cfResult = await this.callCloudflareGateway(prompt, model, startTime);
            if (cfResult.ok) {
                tiers.push({ name: 'Cloudflare Edge', status: 'success', timestamp: Date.now() });
                const val = cfResult.value;
                return {
                    ok: true,
                    value: {
                        ...val,
                        provenance: { tiers, finalModel: val.model, latency: Date.now() - startTime, generationMode, failureCount }
                    }
                };
            }
            tiers.push({ name: 'Cloudflare Edge', status: 'failure', error: String(cfResult.error), timestamp: Date.now() });
            failureCount++;

            // Secondary Fallback to Gemini SDK
            try {
                const geminiResult = await this.callGeminiFallback(prompt, undefined, tools, true);
                tiers.push({ name: 'Gemini Cloud', status: 'success', timestamp: Date.now() });
                const val = (geminiResult as { value: ModelResponse }).value; // Now strictly typed Result<ModelResponse>
                return {
                    ok: true,
                    value: {
                        ...val,
                        provenance: { tiers, finalModel: val.model, latency: Date.now() - startTime, generationMode, failureCount }
                    }
                };
            } catch (geminiError) {
                const errorMessage = geminiError instanceof Error ? geminiError.message : String(geminiError);
                tiers.push({ name: 'Gemini Cloud', status: 'failure', error: errorMessage, timestamp: Date.now() });
                failureCount++;
                generationMode = 'CLI-Fallback';

                // Tertiary Fallback: Sovereign CLI
                const cliResult = await this.callSovereignCLI(prompt);
                if (cliResult.ok) {
                    tiers.push({ name: 'Sovereign CLI', status: 'success', timestamp: Date.now() });
                    const val = cliResult.value;
                    return {
                        ok: true,
                        value: {
                            ...val,
                            provenance: { tiers, finalModel: val.model, latency: Date.now() - startTime, generationMode, failureCount }
                        }
                    };
                }
                tiers.push({ name: 'Sovereign CLI', status: 'failure', error: String(cliResult.error), timestamp: Date.now() });
                failureCount++;

                // Final "Ghost" Fallback (Deterministic)
                generationMode = 'Ghost-Limb';
                const task = model.includes('code') ? 'code-scaffold' : 'text-template';
                const ghostResult = await this.callGhostLimb(task, { prompt });

                if (ghostResult.ok) {
                    tiers.push({ name: 'Ghost Limb', status: 'success', timestamp: Date.now() });
                    return {
                        ok: true,
                        value: {
                            model: `ghost:${task}`,
                            response: (ghostResult.value['result'] as string) || JSON.stringify(ghostResult.value),
                            latency: Date.now() - startTime,
                            provenance: { tiers, finalModel: `ghost:${task}`, latency: Date.now() - startTime, generationMode, failureCount }
                        }
                    };
                }

                return { ok: false, error: cliResult.error };
            }
        }
    }

    /**
     * Generic Cloudflare AI call (Used for Media/Image Gen)
     */
    async callCloudflareAI(model: string, input: unknown, isBinaryInput = false): Promise<Result<unknown>> {
        const gatewayUrl = this.config.cloudflareGatewayUrl;
        if (!gatewayUrl) {
            return { ok: false, error: new Error('Cloudflare AI Gateway URL not configured') };
        }

        const startTime = Date.now();
        try {
            const finalUrl = gatewayUrl.endsWith('/') ? `${gatewayUrl}${model}` : `${gatewayUrl}/${model}`;

            const headers: Record<string, string> = {
                'Authorization': `Bearer ${process.env['CLOUDFLARE_API_TOKEN'] || process.env['CLOUDFLARE_API_KEY'] || ''}`
            };

            if (!isBinaryInput) {
                headers['Content-Type'] = 'application/json';
            } else {
                headers['Content-Type'] = 'application/octet-stream';
            }

            const response = await fetch(finalUrl, {
                method: 'POST',
                headers,
                body: (isBinaryInput ? (input as any) : JSON.stringify(input))
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
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    async transcribeAudio(audioBuffer: Buffer): Promise<Result<string>> {
        const model = this.router ? this.router.routeByAbility(MA.Transcription) : "@cf/openai/whisper";
        this.logger.info({ model }, 'Calling Cloudflare Whisper for transcription');

        const result = await this.callCloudflareAI(model, audioBuffer, true);
        if (!result.ok) return result as unknown as Result<string>;

        const data = result.value as { result?: { text?: string }; text?: string };
        if (data.result && data.result.text) {
            return { ok: true, value: data.result.text };
        }

        return { ok: true, value: data.text || JSON.stringify(data) };
    }

    /**
     * Call a deterministic "Ghost Limb" fallback in the Cloudflare Worker
     */
    async callGhostLimb(task: string, input: unknown): Promise<Result<Record<string, unknown>>> {
        const gatewayUrl = this.config.cloudflareGatewayUrl;
        if (!gatewayUrl) return { ok: false, error: new Error('Cloudflare AI Gateway URL not configured') };

        try {
            const finalUrl = gatewayUrl.endsWith('/') ? `${gatewayUrl}deterministic/${task}` : `${gatewayUrl}/deterministic/${task}`;
            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env['CLOUDFLARE_API_TOKEN'] || process.env['CLOUDFLARE_API_KEY'] || ''}`
                },
                body: JSON.stringify(input)
            });

            if (!response.ok) throw new Error(`Ghost Limb failed (${response.status})`);
            return { ok: true, value: await response.json() as Record<string, unknown> };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
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
            // Use the passed model or a default
            const cfModel = model.startsWith('@cf/') || model.startsWith('@hf/') ? model : "@cf/meta/llama-3.1-8b-instruct";

            const finalUrl = gatewayUrl.endsWith('/') ? `${gatewayUrl}ai/run/${cfModel}` : `${gatewayUrl}/ai/run/${cfModel}`;
            const response = await fetch(finalUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env['CLOUDFLARE_API_TOKEN'] || process.env['CLOUDFLARE_API_KEY'] || ''}`
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Cloudflare Hub failed (${response.status}): ${errorText}`);
            }

            const data = await response.json() as { response?: string; result?: { response?: string } };
            return {
                ok: true,
                value: {
                    model: `cloudflare:${cfModel}`,
                    response: data.response || data.result?.response || JSON.stringify(data),
                    latency: Date.now() - startTime
                }
            };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error({ error: err.message }, 'Cloudflare Universal Hub call failed critically');
            return { ok: false, error: err };
        }
    }

    private async callGeminiFallback(
        prompt: string,
        modelOverride?: string,
        tools?: Tool[],
        disableFallback = false
    ): Promise<Result<ModelResponse>> {
        const startTime = Date.now();
        try {
            if (!this.geminiService) {
                throw new Error('Gemini Service is not initialized (check GOOGLE_API_KEY)');
            }

            const result = await this.geminiService.generateContent(prompt, modelOverride, tools);
            if (!result.ok) throw (result as any).error;

            return result;
        } catch (geminiError) {
            if (disableFallback) throw geminiError;

            this.logger.warn({ geminiError }, 'Gemini execution failed, attempting Cloudflare AI Gateway');
            return this.callCloudflareGateway(prompt, modelOverride || 'gemini-2.0-flash', startTime);
        }
    }

    private async callSovereignCLI(prompt: string): Promise<Result<ModelResponse>> {
        const startTime = Date.now();
        // Using 'gemini -y' as the primary sovereign fallback.
        // This assumes the user has a 'gemini' CLI tool in their path, distinct from the 'gcloud' resource manager.
        // If 'gemini' is not found, we could try 'gcloud gemini ...' but mostly likely that is for resource mgmt.
        // The user's prompt implies 'gemini -y' is the way to Prompt the model.
        const cmd = `gemini -y "${prompt.replace(/"/g, '\\"')}"`;

        try {
            this.logger.info({ cmd }, 'Invoking Sovereign CLI Fallback');
            const { stdout, stderr } = await execAsync(cmd);

            if (stderr && !stdout) {
                this.logger.warn({ stderr }, 'Sovereign CLI stderr output');
            }

            // If we get output, we assume success even if there was stderr (warnings)
            if (stdout) {
                return {
                    ok: true,
                    value: {
                        model: 'cli:gemini-y',
                        response: stdout.trim(),
                        latency: Date.now() - startTime
                    }
                };
            }

            return { ok: false, error: new Error(`Sovereign CLI produced no output. Stderr: ${stderr}`) };

        } catch (error) {
            return { ok: false, error: new Error(`Sovereign CLI execution failed: ${error instanceof Error ? error.message : String(error)}`) };
        }
    }

    private async callOllama(model: string, prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const ollamaPath = this.config.ollamaModelsPath ||
                this.config.errorTrackerModelPath ||
                'D:\\ollama-models';
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
