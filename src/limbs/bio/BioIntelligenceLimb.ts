import { BaseLimb } from '../core/BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { AIDispatcher } from '../../api/ai/Dispatcher.js';

/**
 * BioIntelligenceLimb - Analytical Bio-Intelligence
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class BioIntelligenceLimb extends BaseLimb {
    readonly id = 'bio_intelligence';
    readonly type = 'analytical' as const;

    private readonly dispatcher: AIDispatcher;

    constructor(config: VibeConfig) {
        super(config);
        this.dispatcher = new AIDispatcher(config);
        this.registerBioTools();
    }

    private registerBioTools(): void {
        const tools: import('../../core/ToolingSpine.js').LimbTool[] = [
            {
                name: 'hear_acoustic_analysis',
                description: 'Analyze health-related sounds like coughs or breathing.',
                parameters: {
                    type: 'object' as const,
                    properties: {
                        prompt: { type: 'string', description: 'Clinical context or patient case to analyze' }
                    },
                    required: ['prompt'] as const
                },
                handler: async (args: Record<string, unknown>): Promise<Result<unknown>> => {
                    return this.handleBioCall('hear_acoustic_analysis', args['prompt'] as string);
                }
            },
            {
                name: 'medgemma_reasoning',
                description: 'Perform advanced medical reasoning and comprehension.',
                parameters: {
                    type: 'object' as const,
                    properties: {
                        prompt: { type: 'string', description: 'Clinical context or patient case to analyze' }
                    },
                    required: ['prompt'] as const
                },
                handler: async (args: Record<string, unknown>): Promise<Result<unknown>> => {
                    return this.handleBioCall('medgemma_reasoning', args['prompt'] as string);
                }
            },
            {
                name: 'derm_foundation_analysis',
                description: 'Analyze medical photographs of human skin for dermatological assessment.',
                parameters: {
                    type: 'object' as const,
                    properties: {
                        prompt: { type: 'string', description: 'Clinical context or patient case to analyze' }
                    },
                    required: ['prompt'] as const
                },
                handler: async (args: Record<string, unknown>): Promise<Result<unknown>> => {
                    return this.handleBioCall('derm_foundation_analysis', args['prompt'] as string);
                }
            },
            {
                name: 'pathology_analysis',
                description: 'Analyze pathology slides and H&E patches.',
                parameters: {
                    type: 'object' as const,
                    properties: {
                        prompt: { type: 'string', description: 'Clinical context or patient case to analyze' }
                    },
                    required: ['prompt'] as const
                },
                handler: async (args: Record<string, unknown>): Promise<Result<unknown>> => {
                    return this.handleBioCall('pathology_analysis', args['prompt'] as string);
                }
            }
        ];

        this.registerTools(tools);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const prompt = intent.prompt.toLowerCase();

        // 'Yang': Specific medical substrates = optimal
        const specificSubstrates = ['hear', 'medgemma', 'path foundation', 'derm foundation'];
        if (specificSubstrates.some(s => prompt.includes(s))) return 'Yang';

        // 'YinYang': General medical keywords = maybe
        const keywords = ['medical', 'heart', 'cough', 'skin', 'pathology', 'biological', 'clinical', 'diagnosis'];
        if (keywords.some(k => prompt.includes(k))) return 'YinYang';

        // 'YinYang': Capability matches = maybe
        if (this.spine.getCapabilities().some(cap => prompt.includes(cap))) return 'YinYang';

        return 'Yin';
    }


    override async execute(intent: Intent): Promise<Result<Execution>> {
        const prompt = intent.prompt.toLowerCase();
        let capabilityId = 'medgemma_reasoning'; // Default medical reasoning

        if (prompt.includes('heart') || prompt.includes('cough') || prompt.includes('hear')) {
            capabilityId = 'hear_acoustic_analysis';
        } else if (prompt.includes('skin') || prompt.includes('derm')) {
            capabilityId = 'derm_foundation_analysis';
        } else if (prompt.includes('pathology') || prompt.includes('slide')) {
            capabilityId = 'pathology_analysis';
        }

        const result = await this.spine.handleCall(capabilityId, { prompt: intent.prompt });
        if (!result.ok) {
            const error = (result as { ok: false; error: Error }).error;
            return { ok: false, error };
        }

        const resData = result.value as Record<string, unknown>;

        return {
            ok: true,
            value: {
                output: (resData['output'] as string) || 'Bio-intelligence analysis complete.',
                data: resData['data']
            }
        };
    }

    private async handleBioCall(name: string, payload: string): Promise<Result<unknown>> {
        this.logger.info({ capabilityId: name, payload }, 'Executing bio-intelligence tool call');

        const response = await this.dispatcher.dispatch({
            capabilityId: name,
            payload
        });

        if (!response.success) {
            return { ok: false, error: new Error(response.error || `Bio intelligence tool ${name} failed`) };
        }

        return {
            ok: true,
            value: {
                output: `Bio-intelligence analysis complete via ${name}.`,
                data: response.result
            }
        };
    }
}

