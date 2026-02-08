import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import { type VibeConfig } from '../../core/models.js';
import { GoogleServices } from '../../services/GoogleServices.js';
import { CloudflareServices } from '../../services/CloudflareServices.js';
import { TaskClassifier } from '../../core/TaskClassifier.js';

/**
 * SubstrateLimb - Unified Sensory & Utility Substrate.
 * 
 * Aggregates GCloud Sensory APIs (Vision, NL, Translation) and 
 * Cloudflare Edge-Utility tools to minimize high-tier LLM consumption.
 */
export class SubstrateLimb extends BaseLimb {
    id = 'substrate_utility';
    type = 'analytical' as const;

    constructor(
        config: VibeConfig,
        private readonly google: GoogleServices,
        private readonly cloudflare: CloudflareServices
    ) {
        super(config);
        this.registerSubstrateTools();
    }

    private registerSubstrateTools() {
        this.registerTools([
            {
                name: 'visual_ocr_analysis',
                description: 'Extract text and labels from an image using high-speed Vision AI. Saves multimodal LLM tokens.',
                parameters: {
                    type: 'object',
                    properties: {
                        imageBase64: { type: 'string', description: 'Base64 encoded image data' }
                    },
                    required: ['imageBase64']
                },
                schema: z.object({ imageBase64: z.string() }),
                handler: async ({ imageBase64 }) => {
                    const buffer = Buffer.from(imageBase64, 'base64');
                    return this.google.analyzeImage(buffer);
                }
            },
            {
                name: 'fast_translation',
                description: 'Translate text rapidly using dedicated Translation API. More cost-effective than LLM translation.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text to translate' },
                        target: { type: 'string', description: 'Target language code (default: en)' }
                    },
                    required: ['text']
                },
                schema: z.object({ text: z.string(), target: z.string().optional() }),
                handler: async ({ text, target }) => this.google.translateText(text, target || 'en')
            },
            {
                name: 'entity_intent_extraction',
                description: 'Extract entities and sentiment from text without using an LLM turn.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'Text to analyze' }
                    },
                    required: ['text']
                },
                schema: z.object({ text: z.string() }),
                handler: async ({ text }) => this.google.analyzeEntities(text)
            },
            {
                name: 'edge_bake_asset',
                description: 'Procedurally generate code, markup, or styles at the edge using Cloudflare Workers AI.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Functional core for the asset' },
                        type: { type: 'string', enum: ['style', 'markup', 'logic'], description: 'Category of asset to bake' }
                    },
                    required: ['prompt', 'type']
                },
                schema: z.object({
                    prompt: z.string(),
                    type: z.enum(['style', 'markup', 'logic'])
                }),
                handler: async ({ prompt, type }) => this.cloudflare.edgeBake(prompt, type)
            }
        ]);
    }

    /**
     * Proactively intercept a sensory task (Image/OCR/Translate) before the main turn.
     * Returns enriched context or null if no interception is needed.
     */
    async interceptSensoryTask(prompt: string, context?: any): Promise<string | null> {
        const lower = prompt.toLowerCase();
        const weights = TaskClassifier.analyzeProbabilities(prompt);

        // 1. OCR interception (Robust weight-based check)
        const isOCRIntent = (weights['esoteric'] || 0) > 0.4 || lower.includes('screenshot') || lower.includes('ocr') || lower.includes('analyze image');
        if (isOCRIntent && context?.imageBase64) {
            this.logger.info('Sensory Interception: Triggering proactive OCR pre-processing');
            const result = await this.google.analyzeImage(Buffer.from(context.imageBase64, 'base64'));
            if (result.ok) {
                return `[SENSORY_DATA: OCR_RESULT]\n${JSON.stringify(result.value.fullTextAnnotation?.text || 'No text detected')}\n[/SENSORY_DATA]`;
            }
        }

        // 2. Translation interception (Robust extraction)
        const isTranslateIntent = lower.startsWith('translate') || lower.includes('translation of') || lower.includes('translate this');
        if (isTranslateIntent) {
            this.logger.info('Sensory Interception: Triggering proactive translation');
            // Support multiple patterns: translate "X" to Y, translation of "X" into Y
            const match = prompt.match(/(?:translate|translation of) ["']?(.*?)["']? (?:to|into) (.*)/i);
            if (match?.[1] && match?.[2]) {
                const result = await this.google.translateText(match[1], match[2]);
                if (result.ok) {
                    return `[SENSORY_DATA: TRANSLATION]\n"${match[1]}" -> "${result.value}"\n[/SENSORY_DATA]`;
                }
            }
        }

        return null;
    }
}
