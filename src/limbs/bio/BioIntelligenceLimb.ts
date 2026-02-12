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

    private dispatcher: AIDispatcher;

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
                handler: async (args: Record<string, any>): Promise<Result<unknown>> => {
                    return this.handleBioCall('hear_acoustic_analysis', args['prompt']);
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
                handler: async (args: Record<string, any>): Promise<Result<unknown>> => {
                    return this.handleBioCall('medgemma_reasoning', args['prompt']);
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
                handler: async (args: Record<string, any>): Promise<Result<unknown>> => {
                    return this.handleBioCall('derm_foundation_analysis', args['prompt']);
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
                handler: async (args: Record<string, any>): Promise<Result<unknown>> => {
                    return this.handleBioCall('pathology_analysis', args['prompt']);
                }
            }
        ];

        this.registerTools(tools);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const prompt = intent.prompt.toLowerCase();

        // +1: Specific medical substrates = optimal
        const specificSubstrates = ['hear', 'medgemma', 'path foundation', 'derm foundation'];
        if (specificSubstrates.some(s => prompt.includes(s))) return 1;

        // 0: General medical keywords = maybe
        const keywords = ['medical', 'heart', 'cough', 'skin', 'pathology', 'biological', 'clinical', 'diagnosis'];
        if (keywords.some(k => prompt.includes(k))) return 0;

        // 0: Capability matches = maybe
        if (this.spine.getCapabilities().some(cap => prompt.includes(cap))) return 0;

        return -1;
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
        if (!result.ok) return { ok: false, error: result.error };

        return {
            ok: true,
            value: {
                output: (result.value as any)['output'],
                data: (result.value as any)['data']
            }
        };
    }

    private async handleBioCall(name: string, payload: string): Promise<Result<any>> {
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

