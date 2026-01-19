import { NeuralLimb, Intent, Execution } from './NeuralLimb.js';
import { HexagramManager } from '../../core/HexagramManager.js';
import { Result } from '../../core/models.js';
import pino from 'pino';

const logger = pino({
    name: 'HexagramLimb',
    base: { hostname: 'POG-VIBE' }
});

export class HexagramLimb implements NeuralLimb {
    id = 'hexagram_memory';
    type = 'memory' as const;
    capabilities = ['manage_long_term_context', 'pin_information', 'binary_esoteric_recall'];

    constructor(
        private readonly manager: HexagramManager
    ) { }

    async canHandle(intent: Intent): Promise<boolean> {
        const keywords = ['pin to hexagram', 'unpin from hexagram', 'check hexagram', 'hexagram slot', 'card holder'];
        return keywords.some(k => intent.prompt.toLowerCase().includes(k)) ||
            (intent.tools?.some((t: any) => t.function.name.includes('hexagram')) ?? false);
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        logger.info({ intent: intent.prompt }, 'Hexagram Limb activated');

        // Note: In the real orchestrator, the tools are called directly via ModelExecutor.
        // This execute method is a fallback for natural language intent routing.
        return {
            ok: true,
            value: {
                output: 'Hexagram Memory tools are available. Use pin_to_hexagram to store critical context.',
                data: { status: 'active' }
            }
        };
    }

    // Explicit tool definitions for the Orchestrator to register
    getTools(): { functionDeclarations: any[] }[] {
        return [
            {
                functionDeclarations: [
                    {
                        name: 'pin_to_hexagram',
                        description: 'Pin a high-priority context card to a specific hexagram slot (Line 1-6).',
                        parameters: {
                            type: 'object',
                            properties: {
                                lineIndex: { type: 'number', description: 'The line index (1: Foundation, 6: UI Culmination)' },
                                title: { type: 'string', description: 'Brief title for the context card' },
                                content: { type: 'string', description: 'Detailed context content' },
                                state: {
                                    type: 'number',
                                    enum: [0, 1, 2, 3],
                                    description: 'Line state (0: Old Yang/Moving, 1: Young Yin, 2: Young Yang, 3: Old Yin/Moving)'
                                }
                            },
                            required: ['lineIndex', 'title', 'content']
                        }
                    },
                    {
                        name: 'consult_hexagram',
                        description: 'Retrieve the current state of all 6 hexagram card holders.',
                        parameters: {
                            type: 'object',
                            properties: {}
                        }
                    }
                ]
            }
        ];
    }

    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        switch (name) {
            case 'pin_to_hexagram':
                return this.manager.pinCard(args.lineIndex, args.title, args.content, args.state);
            case 'consult_hexagram':
                const context = await this.manager.formatForPrompt();
                return { ok: true, value: context };
            default:
                return { ok: false, error: new Error(`Unknown tool: ${name} `) };
        }
    }
}
