import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import { Intent, Execution, TernaryDecision } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import type { ModelExecutor } from '../../core/ModelExecutor.js';

/**
 * QuantumLimb - Superposition of Models
 * 
 * Capability: Runs intent across multiple models in parallel (Gemini, Qwen, DeepSeek).
 * Synthesis: Collapses the wave function into a single, high-fidelity result.
 * 
 * STATUS: ACTIVE (Maximal Operational Mode)
 */
export class QuantumLimb extends BaseLimb {
    readonly id = 'quantum_superposition';
    readonly type = 'creative' as const;

    constructor(
        config: VibeConfig,
        executor?: ModelExecutor
    ) {
        super(config, executor);
        this.registerTools([
            {
                name: 'quantum_superposition',
                description: 'Run an intent across multiple specialized models in parallel and collapse into a synthesis.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'The prompt to analyze in superposition' }
                    },
                    required: ['prompt']
                },
                schema: z.object({
                    prompt: z.string().describe('The prompt to analyze in superposition')
                }),
                handler: (args) => this.executeSuperposition(args['prompt'])
            }
        ]);
    }

    private async executeSuperposition(prompt: string): Promise<any> {
        const res = await this.execute({ prompt });
        return res.ok ? res.value : { output: `Superposition failed: ${res.error.message}`, data: { error: true } };
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        // +1: Explicit quantum keywords = optimal
        if (userIntent.includes('quantum') || userIntent.includes('superposition')) return 1;

        // Ternary complexity thresholds
        const context = intent.context as Record<string, any>;
        const complexity = context?.['complexity'] ?? 0.5;
        if (complexity > 0.9) return 1;   // Very high complexity = escalate
        if (complexity > 0.7) return 0;   // High complexity = maybe
        return -1;                         // Normal complexity = skip
    }


    override async execute(intent: Intent): Promise<Result<Execution>> {
        if (!this.executor) {
            return { ok: false, error: new Error('QuantumLimb requires a ModelExecutor for superposition.') };
        }

        const startTime = Date.now();
        const models = [
            { id: 'qwen2.5-coder', role: 'Architect (Structural Planning)' },
            { id: 'deepseek-coder-v2', role: 'Implementer (Precise Code Generation)' },
            { id: 'gemini-2.0-flash', role: 'Critic (Synthesis & Validation)' }
        ];

        this.logger.info({ state: 'superposition_start', models: models.length }, `Igniting Superposition across ${models.length} specialized intelligences...`);

        // 1. Superposition: Run parallel specialized queries
        const promises = models.map(async (m) => {
            const rolePrompt = `Role: ${m.role}\nTask: ${intent.prompt}\n\nProvide your specialized contribution:`;
            try {
                const result = await this.executor!.callModel(m.id, rolePrompt);
                if (result.ok) {
                    return { id: m.id, role: m.role, text: result.value.response, success: true };
                }
                return { id: m.id, role: m.role, text: `Error: ${result.error.message}`, success: false };
            } catch (e: any) {
                return { id: m.id, role: m.role, text: `Critical Failure: ${e.message}`, success: false };
            }
        });

        const fragments = await Promise.all(promises);

        // 2. Collapse: Synthesis via the Critic (Gemini)
        const synthesisPrompt = `
        You are the QUANTUM CRITIC. You have just overseen a parallel execution of three specialized models.
        
        INPUT PROMPT: ${intent.prompt}
        
        CONTRIBUTIONS:
        ${fragments.map(f => `--- MODEL: ${f.id} (${f.role}) ---\n${f.text}`).join('\n\n')}
        
        TASK:
        Collapse these wave functions into a single "High-Fidelity Truth". 
        Condense the Architect's structure, the Implementer's logic, and reconcile any contradictions.
        Output ONLY the final synthesized solution.
        `.trim();

        this.logger.info({ state: 'synthesis_start' }, 'Collapsing wave function into Synthesis...');
        const finalSynthesis = await this.executor.callModel('gemini-2.0-flash', synthesisPrompt);

        if (!finalSynthesis.ok) {
            return { ok: false, error: finalSynthesis.error };
        }

        return {
            ok: true,
            value: {
                output: `=== QUANTUM SUPERPOSITION RESULT ===\n\n${finalSynthesis.value.response}\n\n>> WAVE FUNCTION COLLAPSED in ${Date.now() - startTime}ms`,
                data: {
                    state: 'collapsed',
                    fragments: fragments.map(f => ({ model: f.id, success: f.success })),
                    latency: Date.now() - startTime
                }
            }
        };
    }
}
