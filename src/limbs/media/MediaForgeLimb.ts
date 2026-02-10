import { BaseLimb } from '../core/BaseLimb.js';
import { VibeConfig, ModelAbility as MA } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { FreeModelRouter } from '../../core/Router.js';

/**
 * MediaForgeLimb - Generative Media Intelligence for Sovereign AI
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class MediaForgeLimb extends BaseLimb {
    id = 'media_forge';
    type = 'creative' as const;

    constructor(
        config: VibeConfig,
        private readonly modelExecutor: ModelExecutor,
        private readonly router: FreeModelRouter
    ) {
        super(config);
        this.registerMediaTools();
    }

    private registerMediaTools(): void {
        this.registerTools([
            {
                name: 'media_forge_request',
                description: 'Generate images, videos, or audio using specialized neural forges.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Detailed visual or auditory description' },
                        targetType: { type: 'string', enum: ['image', 'speech', 'vision', 'model'], description: 'Type of media to forge' }
                    },
                    required: ['prompt', 'targetType']
                },
                handler: async (args: any) => {
                    let ability: MA;
                    const target = args['targetType'].toLowerCase();

                    if (target === 'vision') ability = MA.Vision;
                    else if (target === 'speech') ability = MA.TTS;
                    else if (target === 'model') ability = 'RSMV' as MA;
                    else ability = MA.ImageGen;

                    this.logger.info({ ability, prompt: args['prompt'].substring(0, 50) + '...' }, 'Routing media task by ability');
                    const model = this.router.routeByAbility(ability);
                    const result = await this.modelExecutor.callCloudflareAI(model, { prompt: args['prompt'] });

                    if (!result.ok) return result;

                    return {
                        ok: true,
                        value: {
                            output: `Successfully forged ${target} media using professional ${ability} tools.`,
                            data: result.value
                        }
                    };
                }
            }
        ]);
    }

    // Override canHandle for backward compatibility and broad detection
    override async canHandle(intent: import('../core/NeuralLimb.js').Intent): Promise<import('../core/NeuralLimb.js').TernaryDecision> {
        if (!this.config.enabledServices.includes('MEDIA_FORGE')) return -1;

        const prompt = intent.prompt.toLowerCase();

        // +1: Explicit creative keywords = optimal
        const highEscalation = ['forge', 'rsmv', 'model', 'visual'];
        if (highEscalation.some(k => prompt.includes(k))) return 1;

        // 0: General media keywords = maybe
        const keywords = ['generate', 'create', 'image', 'video', 'music', 'sound', 'audio'];
        if (keywords.some(k => prompt.includes(k))) return 0;

        return -1;
    }

}

