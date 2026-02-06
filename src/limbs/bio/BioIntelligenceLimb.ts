import { NeuralLimb, Intent, Execution } from '../core/NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { AIDispatcher } from '../../api/ai/Dispatcher.js';
import pino from 'pino';

const logger = pino({
    name: 'BioIntelligenceLimb',
    base: { hostname: 'POG-VIBE' }
});

export class BioIntelligenceLimb implements NeuralLimb {
    id = 'bio_intelligence';
    type = 'analytical' as const;
    capabilities = ['hear_acoustic_analysis', 'medgemma_reasoning', 'derm_foundation_analysis', 'pathology_analysis'];

    private dispatcher: AIDispatcher;

    constructor(config: VibeConfig) {
        this.dispatcher = new AIDispatcher(config);
        logger.debug('BioIntelligenceLimb initialized');
    }

    async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        const keywords = ['medical', 'heart', 'cough', 'sound', 'skin', 'pathology', 'biological', 'clinical', 'diagnosis'];
        const matchesKeyword = keywords.some(k => prompt.includes(k));

        // Specific esoteric substrates
        const specificSubstrates = ['hear', 'medgemma', 'path foundation', 'derm foundation'];
        const matchesSubstrate = specificSubstrates.some(s => prompt.includes(s));

        return matchesKeyword || matchesSubstrate;
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        const prompt = intent.prompt.toLowerCase();
        let capabilityId = 'medgemma_reasoning'; // Default medical reasoning

        if (prompt.includes('heart') || prompt.includes('cough') || prompt.includes('hear')) {
            capabilityId = 'hear_acoustic_analysis';
        } else if (prompt.includes('skin') || prompt.includes('derm')) {
            capabilityId = 'derm_foundation_analysis';
        } else if (prompt.includes('pathology') || prompt.includes('slide')) {
            capabilityId = 'pathology_analysis';
        }

        const result = await this.handleToolCall(capabilityId, intent.prompt);
        if (!result.ok) return { ok: false, error: result.error };

        return {
            ok: true,
            value: {
                output: result.value.output,
                data: result.value.data
            }
        };
    }

    getTools(): any[] {
        return [
            {
                functionDeclarations: [
                    {
                        name: 'hear_acoustic_analysis',
                        description: 'Analyze health-related sounds like coughs or breathing.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Description of the acoustic data or clinical context' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'medgemma_reasoning',
                        description: 'Perform advanced medical reasoning and comprehension.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'The medical query or patient case to analyze' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'derm_foundation_analysis',
                        description: 'Analyze medical photographs of human skin for dermatological assessment.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Description of the skin condition or clinical imagery' }
                            },
                            required: ['prompt']
                        }
                    },
                    {
                        name: 'pathology_analysis',
                        description: 'Analyze pathology slides and H&E patches.',
                        parameters: {
                            type: 'object',
                            properties: {
                                prompt: { type: 'string', description: 'Clinical context for the pathology analysis' }
                            },
                            required: ['prompt']
                        }
                    }
                ]
            }
        ];
    }

    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        logger.info({ capabilityId: name, args }, 'Executing bio-intelligence tool call');
        const payload = typeof args === 'string' ? args : args.prompt;

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

