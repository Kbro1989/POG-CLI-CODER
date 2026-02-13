import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { spawn, ChildProcess } from 'child_process';

/**
 * YoloLimb - High-Risk Reasoning & Unrestricted Creation
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class YoloLimb extends BaseLimb {
    readonly id = 'yolo_substrate';
    readonly type = 'creative' as const;
    private readonly activeProcesses: Set<ChildProcess> = new Set();

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
                handler: async (args: Record<string, unknown>) => {
                    const result = await this.executeYoloCommand(args['prompt'] as string);
                    if (result.ok) return { ok: true, value: result.value.output };
                    return result;
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const prompt = intent.prompt.toLowerCase();

        // 'Yang' (Escalate / Optimal): Explicit YOLO or Nuclear/Shell keywords
        if (prompt.includes('yolo') || prompt.includes('nuclear') || prompt.includes('sidecar shell')) {
            return 'Yang';
        }

        // 'YinYang' (Balanced / Neutral): Matches known capabilities but lacks explicit YOLO trigger
        if (this.spine.getCapabilities().some(cap => prompt.includes(cap))) {
            return 'YinYang';
        }

        // 'Yin' (De-escalate / Skip): No trigger or capability match
        return 'Yin';
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        this.logger.info({ intent: intent.prompt }, 'Activating YOLO substrate');

        // Hard-coded resolve: Ensure we only dispatch via documented handleCall path
        const result = await this.spine.handleCall('yolo_reasoning', { prompt: intent.prompt });

        if (!result.ok) return result;

        // Ensure result maps cleanly to Execution substrate
        return {
            ok: true,
            value: result.value as Execution
        };
    }

    private async executeYoloCommand(prompt: string): Promise<Result<Execution>> {
        let child: ChildProcess | undefined;
        try {
            return await new Promise<Result<Execution>>((resolve) => {
                child = spawn('gemini', ['--yolo', prompt], {
                    shell: true
                });
                this.activeProcesses.add(child);

                let stdout = '';
                let stderr = '';

                child.stdout!.on('data', (data) => { stdout += data.toString(); });
                child.stderr!.on('data', (data) => { stderr += data.toString(); });

                child.on('close', (code) => {
                    if (child) this.activeProcesses.delete(child);
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
                    if (child) this.activeProcesses.delete(child);
                    this.logger.error({ err }, 'YOLO spawn error');
                    resolve({ ok: false, error: err });
                });
            });
        } finally {
            if (child && child.exitCode === null) {
                child.kill();
            }
        }
    }

    /**
     * Proper Close: Ensures all active YOLO substrate processes are terminated.
     */
    public override async close(): Promise<void> {
        this.logger.info({ activeProcesses: this.activeProcesses.size }, 'Cleaning up YOLO resources...');
        for (const child of this.activeProcesses) {
            if (child.exitCode === null) {
                child.kill();
            }
        }
        this.activeProcesses.clear();
    }
}
