import { NeuralLimb, Intent, Execution } from './NeuralLimb.js';
import { Result } from '../../core/models.js';
import { spawn } from 'child_process';
import pino from 'pino';

const logger = pino({
    name: 'YoloLimb',
    base: { hostname: 'POG-VIBE' }
});

export class YoloLimb implements NeuralLimb {
    id = 'yolo_substrate';
    type = 'creative' as const;
    capabilities = ['high_risk_reasoning', 'unrestricted_creation', 'sidecar_shell'];

    constructor() { }

    async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        return prompt.includes('yolo') || prompt.includes('nuclear') || prompt.includes('sidecar shell');
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        logger.info({ intent: intent.prompt }, 'Activating YOLO substrate via gemini-cli');

        return new Promise((resolve) => {
            const child = spawn('gemini', ['--yolo', intent.prompt], {
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
                    logger.error({ code, stderr }, 'YOLO execution failed');
                    resolve({
                        ok: false,
                        error: new Error(`YOLO substrate failed with code ${code}: ${stderr}`)
                    });
                }
            });

            child.on('error', (err) => {
                logger.error({ err }, 'YOLO spawn error');
                resolve({ ok: false, error: err });
            });
        });
    }

    getTools(): any[] {
        return [
            {
                functionDeclarations: [
                    {
                        name: 'yolo_reasoning',
                        description: 'Execute high-creativity reasoning using the unrestricted YOLO substrate.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'The creative or complex prompt' }
                            },
                            required: ['prompt']
                        }
                    }
                ]
            }
        ];
    }

    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        if (name === 'yolo_reasoning') {
            const result = await this.execute({ prompt: args.prompt });
            if (result.ok) return { ok: true, value: result.value.output };
            return result;
        }
        return { ok: false, error: new Error(`Unknown tool: ${name}`) };
    }
}
