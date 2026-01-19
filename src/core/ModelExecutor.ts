import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';
import { Tool } from '@google/genai';
import {
    Result,
    ModelResponse,
    VibeConfig
} from './models.js';
import { GeminiService } from './GeminiService.js';

const execAsync = promisify(exec);

export class ModelExecutor {
    private readonly logger: pino.Logger;

    constructor(
        private readonly config: VibeConfig,
        private readonly geminiService: GeminiService | undefined
    ) {
        this.logger = pino({
            name: 'ModelExecutor',
            base: { hostname: this.config.agentName }
        });
    }

    async callModel(model: string, prompt: string, tools?: Tool[]): Promise<Result<ModelResponse>> {
        const startTime = Date.now();

        // Cloud-only models (starting with gemini:)
        if (model.startsWith('gemini:')) {
            const geminiModel = model.replace('gemini:', '');
            return this.callGeminiFallback(prompt, geminiModel, tools);
        }

        const STORAGE_THRESHOLD_GB = 5;
        const CONTEXT_THRESHOLD_TOKENS = 32000;

        // 1. Storage Health Check
        const storageCheck = await this.checkStorageHealth(STORAGE_THRESHOLD_GB);
        if (!storageCheck.ok) {
            this.logger.warn({ error: storageCheck.error, action: 'forcing_cloud_fallback' }, 'Local storage critical');
            return this.callGeminiFallback(prompt, undefined, tools);
        }

        // 2. Context Overflow Detection (Approx 4 chars per token)
        const estimatedTokens = prompt.length / 4;
        if (estimatedTokens > CONTEXT_THRESHOLD_TOKENS) {
            this.logger.info({ tokens: estimatedTokens, action: 'forcing_cloud_fallback' }, 'Prompt exceeds local context');
            return this.callGeminiFallback(prompt, 'gemini-2.0-flash', tools);
        }

        // 3. Try Local Ollama First
        try {
            const response = await this.callOllama(model, prompt);
            return { ok: true, value: { model, response, latency: Date.now() - startTime } };
        } catch (ollamaError) {
            this.logger.warn({ model, error: ollamaError }, 'Ollama execution failed, attempting fallback to Gemini');
            return this.callGeminiFallback(prompt, undefined, tools);
        }
    }

    private async callGeminiFallback(
        prompt: string,
        modelOverride?: string,
        tools?: Tool[]
    ): Promise<Result<ModelResponse>> {
        try {
            if (!this.geminiService) {
                throw new Error('Gemini Service is not initialized (check GOOGLE_API_KEY)');
            }

            const result = await this.geminiService.generateContent(prompt, modelOverride, tools);
            if (!result.ok) throw result.error;

            return result;
        } catch (geminiError) {
            this.logger.error({ geminiError }, 'All model attempts failed (Local + Cloud)');
            return { ok: false, error: geminiError as Error };
        }
    }

    private async callOllama(model: string, prompt: string): Promise<string> {
        // OPTIMAL: Using CLI for Ollama to force OLLAMA_MODELS path and bypass server timeouts/stale endpoints
        // As requested: "D:\ollama-models" call upon each model, no time limit.
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

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout.trim());
                } else {
                    reject(new Error(`Ollama CLI failed with code ${code}: ${stderr}`));
                }
            });

            child.on('error', (err) => {
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
