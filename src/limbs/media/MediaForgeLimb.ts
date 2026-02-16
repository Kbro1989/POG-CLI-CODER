import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import { VibeConfig, ModelAbility as MA } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { FreeModelRouter } from '../../core/Router.js';
import { YaoState } from '../../core/models.js';

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
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Detailed visual or auditory description' },
                        targetType: { type: 'string', enum: ['image', 'speech', 'vision', 'model'], description: 'Type of media to forge' }
                    },
                    required: ['prompt', 'targetType']
                },
                schema: z.object({
                    prompt: z.string(),
                    targetType: z.enum(['image', 'speech', 'vision', 'model'])
                }),
                handler: async (args: Record<string, unknown>) => {
                    let ability: MA;
                    const target = (args['targetType'] as string).toLowerCase();

                    if (target === 'vision') ability = MA.Vision;
                    else if (target === 'speech') ability = MA.TTS;
                    else if (target === 'model') ability = 'RSMV' as MA;
                    else ability = MA.ImageGen;

                    this.logger.info({ ability, prompt: (args['prompt'] as string).substring(0, 50) + '...' }, 'Routing media task by ability');
                    const model = this.router.routeByAbility(ability);

                    // Unified callModel now handles Ollama + D:\ storage automatically
                    const result = await this.modelExecutor.callModel(model, args['prompt'] as string);

                    if (!result.ok) {
                        await this.pinPulse(YaoState.OldYin, `Media Forge Fail: ${target}`);
                        return result;
                    }

                    await this.pinPulse(YaoState.OldYang, `Media Forged: ${target}`);
                    return {
                        ok: true,
                        value: {
                            output: result.value.response,
                            data: result.value
                        }
                    };
                }
            }
        ]);
    }


    // Override canHandle for backward compatibility and broad detection
    override async canHandle(intent: import('../core/NeuralLimb.js').Intent): Promise<import('../core/NeuralLimb.js').TernaryDecision> {
        const base = await super.canHandle(intent);
        if (base === 'Yin') return 'Yin';

        const prompt = intent.prompt.toLowerCase();

        // 'Yang': Explicit creative keywords = optimal
        const highEscalation = ['forge', 'rsmv', 'model', 'visual'];
        if (highEscalation.some(k => prompt.includes(k))) return 'Yang';

        // 'YinYang': General media keywords = maybe
        const keywords = ['generate', 'create', 'image', 'video', 'music', 'sound', 'audio'];
        if (keywords.some(k => prompt.includes(k))) return 'YinYang';

        return 'Yin';
    }

}

