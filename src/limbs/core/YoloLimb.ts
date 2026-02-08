import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { spawn } from 'child_process';

/**
 * YoloLimb - High-Risk Reasoning & Unrestricted Creation
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class YoloLimb extends BaseLimb {
    readonly id = 'yolo_substrate';
    readonly type = 'creative' as const;

    constructor(config: VibeConfig) {
        super(config);
        this.registerYoloTools();
    }

    private registerYoloTools(): void {
        this.registerTools([
            {
                name: 'yolo_reasoning',
                description: 'Execute high-creativity reasoning using the unrestricted YOLO substrate.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'The creative or complex prompt' }
                    },
                    required: ['prompt']
                },
                handler: async (args: any) => {
                    const result = await this.executeYoloCommand(args.prompt);
                    if (result.ok) return { ok: true, value: result.value.output };
                    return result;
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        return prompt.includes('yolo') || prompt.includes('nuclear') || prompt.includes('sidecar shell') ||
            this.spine.getCapabilities().some(cap => prompt.includes(cap));
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        this.logger.info({ intent: intent.prompt }, 'Activating YOLO substrate');
        return this.spine.handleCall('yolo_reasoning', { prompt: intent.prompt }) as any;
    }

    private async executeYoloCommand(prompt: string): Promise<Result<Execution>> {
        return new Promise((resolve) => {
            const child = spawn('gemini', ['--yolo', prompt], {
                shell: true
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => { stdout += data.toString(); });
            child.stderr.on('data', (data) => { stderr += data.toString(); });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        ok: true,
                        value: {
                            output: stdout.trim(),
                            data: { raw: stdout, exitCode: code }
                        }
                    });
                } else {
                    this.logger.error({ code, stderr }, 'YOLO execution failed');
                    resolve({
                        ok: false,
                        error: new Error(`YOLO substrate failed with code ${code}: ${stderr}`)
                    });
                }
            });

            child.on('error', (err) => {
                this.logger.error({ err }, 'YOLO spawn error');
                resolve({ ok: false, error: err });
            });
        });
    }
}
