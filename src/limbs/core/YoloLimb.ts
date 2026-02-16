import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { YaoState } from '../../core/models.js';
import type { LimbTool } from '../../core/ToolingSpine.js';

/**
 * YoloLimb - Fast Execution Bypass
 *
 * Executes trusted, low-risk operations without adversarial validation.
 * When the Orchestrator detects a simple, well-understood intent,
 * YoloLimb provides a direct execution path — no Generator-Critic loop,
 * no multi-model synthesis. Just raw speed.
 *
 * Sovereign Analogy: Muscle memory — reflexive actions that bypass the cortex.
 *
 * Triggers: Simple file edits, known-safe refactors, documentation updates,
 * formatting fixes, dependency installs.
 */
export class YoloLimb extends BaseLimb {
    readonly id = 'yolo_limb';
    readonly type = 'action' as const;

    private executionCount: number = 0;
    private readonly bypassedValidations: number = 0;

    // Hexagram affinity: Creative (Heaven over Heaven) — pure Yang action
    public override preferredHexagrams = ['111111'];
    // Avoid Hexagrams that suggest caution
    public override avoidHexagrams = ['010111', '001010'];

    constructor(config: VibeConfig) {
        super(config);

        const tools: LimbTool[] = [
            {
                name: 'yolo_execute',
                description: 'Execute a trusted operation without adversarial validation. For simple, well-understood tasks like formatting, small edits, or documentation.',
                parameters: {
                    type: 'object',
                    properties: {
                        task: { type: 'string', description: 'Description of the task to execute.' },
                        code: { type: 'string', description: 'The code or content to apply directly.' },
                        targetFile: { type: 'string', description: 'Optional target file path for the operation.' },
                        confidence: { type: 'number', description: 'Confidence level (0.0-1.0). Operations below 0.8 are rejected.' }
                    },
                    required: ['task', 'code']
                },
                handler: async (args: Record<string, unknown>) => {
                    const task = String(args['task'] || '');
                    const code = String(args['code'] || '');
                    const confidence = Number(args['confidence'] || 0.9);

                    // Safety gate: reject low-confidence operations
                    if (confidence < 0.8) {
                        await this.pinPulse(YaoState.OldYin, `YOLO rejected: confidence ${confidence} below threshold`);
                        return {
                            ok: false as const,
                            error: new Error(`Confidence ${confidence} below YOLO threshold (0.8). Route to adversarial pipeline.`)
                        };
                    }

                    this.executionCount++;
                    await this.pinPulse(YaoState.OldYang, `YOLO #${this.executionCount}: ${task.substring(0, 60)}`);

                    return {
                        ok: true as const,
                        value: {
                            output: code,
                            data: {
                                source: 'yolo_limb',
                                bypassedAdversarial: true,
                                confidence,
                                executionNumber: this.executionCount,
                                task
                            }
                        }
                    };
                }
            },
            {
                name: 'yolo_batch',
                description: 'Execute multiple trusted operations in a single pass. All operations must be above confidence threshold.',
                parameters: {
                    type: 'object',
                    properties: {
                        operations: {
                            type: 'array',
                            description: 'Array of { task, code, targetFile } objects.',
                            items: {
                                type: 'object',
                                properties: {
                                    task: { type: 'string' },
                                    code: { type: 'string' },
                                    targetFile: { type: 'string' }
                                }
                            }
                        }
                    },
                    required: ['operations']
                },
                handler: async (args: Record<string, unknown>) => {
                    const ops = args['operations'] as Array<{ task: string; code: string; targetFile?: string }> || [];
                    const results: Array<{ task: string; status: string }> = [];

                    for (const op of ops) {
                        this.executionCount++;
                        results.push({ task: op.task, status: 'executed' });
                    }

                    await this.pinPulse(YaoState.OldYang, `YOLO batch: ${ops.length} operations executed`);

                    return {
                        ok: true as const,
                        value: {
                            output: `Batch executed: ${ops.length} operations`,
                            data: {
                                source: 'yolo_limb',
                                bypassedAdversarial: true,
                                batchSize: ops.length,
                                results
                            }
                        }
                    };
                }
            }
        ];

        this.registerTools(tools);
        this.logger.info('YoloLimb initialized — fast execution bypass active.');
    }

    /**
     * YOLO handles simple, clear-intent tasks with high confidence.
     * Keywords: format, fix, rename, simple, quick, just, small, typo, docs
     */
    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = this.getUserIntent(intent).toLowerCase();

        const yoloKeywords = [
            'format', 'fix typo', 'rename', 'simple', 'quick', 'just ',
            'small change', 'update docs', 'add comment', 'fix spacing',
            'fix indent', 'lint', 'prettier', 'trivial'
        ];

        const matchCount = yoloKeywords.filter(kw => p.includes(kw)).length;
        if (matchCount >= 2) return 'Yang';
        if (matchCount === 1) return 'YinYang';

        return 'Yin'; // Default: don't intercept complex tasks
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        this.executionCount++;
        const userIntent = this.getUserIntent(intent);

        if (this.executor) {
            const prompt = `You are the YOLO limb — fast execution, no overthinking.
Execute this simple task directly. Be concise. No validation needed.

Task: ${userIntent}`;

            const response = await this.executor.callModel('gemini:gemini-2.0-flash', prompt);
            if (response.ok) {
                await this.pinPulse(YaoState.OldYang, `YOLO direct: ${userIntent.substring(0, 40)}`);
                return {
                    ok: true,
                    value: {
                        output: `[YOLO #${this.executionCount}] ${response.value.response}`,
                        data: { source: 'yolo_limb', bypassedAdversarial: true }
                    }
                };
            }
        }

        return {
            ok: false,
            error: new Error('YoloLimb requires a ModelExecutor for direct execution.')
        };
    }

    override getStatus(): Record<string, unknown> {
        return {
            ...super.getStatus(),
            executionCount: this.executionCount,
            bypassedValidations: this.bypassedValidations,
            mode: 'fast_bypass'
        };
    }
}
