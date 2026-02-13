import { BaseLimb } from '../core/BaseLimb.js';
import type { Intent, Execution } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { z } from 'zod';

export interface EntityDefinition {
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    metadata: Record<string, any>;
}

/**
 * EntityLimb - 3D Scene Management Substrate
 * 
 * Manages the "Bubble World" entity registry and serialization.
 * This is the logic layer for Three.js-powered visualizations.
 */
export class EntityLimb extends BaseLimb {
    readonly id = 'entity_limb';
    readonly type = 'creative';
    private readonly entities: Map<string, EntityDefinition> = new Map();

    constructor(config: VibeConfig) {
        super(config);
        this.registerTools([
            {
                name: 'create_entity',
                description: 'Creates or updates a 3D entity in the current scene context.',
                parameters: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', description: 'Unique identifier' },
                        entityType: { type: 'string', description: 'Type of entity (e.g., cube, model, light)' },
                        position: { type: 'array', items: { type: 'number' }, minItems: 3, maxItems: 3 }
                    },
                    required: ['id', 'entityType']
                },
                schema: z.object({
                    id: z.string(),
                    entityType: z.string(),
                    position: z.array(z.number()).length(3).optional()
                }),
                handler: async (args) => this.createEntity(args)
            },
            {
                name: 'serialize_scene',
                description: 'Returns the current scene as a JSON object for rendering.',
                parameters: { type: 'object', properties: {} },
                handler: async () => this.serializeScene()
            },
            {
                name: 'clear_scene',
                description: 'Removes all entities from the current scene.',
                parameters: { type: 'object', properties: {} },
                handler: async () => {
                    this.entities.clear();
                    return { ok: true, value: 'Scene cleared' };
                }
            }
        ]);
    }

    private async createEntity(args: any): Promise<Result<EntityDefinition>> {
        const entity: EntityDefinition = {
            id: args['id'],
            type: args['entityType'],
            position: { x: args['position']?.[0] || 0, y: args['position']?.[1] || 0, z: args['position']?.[2] || 0 },
            scale: { x: 1, y: 1, z: 1 },
            metadata: {}
        };

        this.entities.set(args['id'], entity);
        this.logger.info({ entityId: args['id'] }, 'Entity manifested in scene');
        return { ok: true, value: entity };
    }

    private async serializeScene(): Promise<Result<string>> {
        const scene = Array.from(this.entities.values());
        return { ok: true, value: JSON.stringify(scene, null, 2) };
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        const p = intent.prompt.toLowerCase();

        if (p.includes('scene') || p.includes('render') || p.includes('3d')) {
            const scene = await this.spine.handleCall('serialize_scene', {});
            if (scene.ok) return { ok: true, value: { output: `[SCENE_MANIFEST]\n${JSON.stringify(scene.value, null, 2)}` } };
        }

        return super.execute(intent);
    }
}
