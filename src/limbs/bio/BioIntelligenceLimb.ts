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
        const keywords = ['medical', 'health', 'heart', 'cough', 'sound', 'skin', 'pathology', 'biological', 'clinical', 'diagnosis'];
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

        logger.info({ capabilityId, prompt: intent.prompt }, 'Executing esoteric bio-medical task');

        const response = await this.dispatcher.dispatch({
            capabilityId,
            payload: intent.prompt
        });

        if (!response.success) {
            return { ok: false, error: new Error(response.error || 'Bio intelligence execution failed') };
        }

        return {
            ok: true,
            value: {
                output: `Bio-intelligence analysis complete via ${capabilityId}. Result: ${JSON.stringify(response.result)}`,
                data: response.result
            }
        };
    }
}
