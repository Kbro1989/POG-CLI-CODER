import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import { HexagramManager } from '../../core/HexagramManager.js';
import type { Result, VibeConfig } from '../../core/models.js';

/**
 * HexagramLimb - Context-aware Memory Management
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class HexagramLimb extends BaseLimb {
    readonly id = 'hexagram_memory';
    readonly type = 'memory' as const;

    constructor(
        config: VibeConfig,
        private readonly manager: HexagramManager
    ) {
        super(config);
        this.registerHexagramTools();
    }

    private registerHexagramTools(): void {
        this.registerTools([
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
                },
                handler: async (args: any) => {
                    return this.manager.pinCard(args.lineIndex, args.title, args.content, args.state);
                }
            },
            {
                name: 'consult_hexagram',
                description: 'Retrieve the current state of all 6 hexagram card holders.',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                handler: async () => {
                    const context = await this.manager.formatForPrompt();
                    return { ok: true, value: context };
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = intent.prompt.toLowerCase();

        // +1: Explicit hexagram keywords = optimal
        const keywords = ['pin to hexagram', 'unpin from hexagram', 'check hexagram', 'hexagram slot', 'card holder'];
        if (keywords.some(k => p.includes(k))) return 1;

        // 0: Capability matches = maybe
        if (this.spine.getCapabilities().some(cap => p.includes(cap))) return 0;

        return -1;
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        this.logger.info({ intent: intent.prompt }, 'Hexagram Limb activated');

        const prompt = intent.prompt.toLowerCase();

        // NL Parsing: "Pin [title] to Line [index]: [content]"
        const pinMatch = prompt.match(/pin (?:card )?"([^"]+)" to line (\d)/i);
        if (pinMatch) {
            const title = pinMatch[1] || 'Untitled';
            const lineIndex = parseInt(pinMatch[2] || '1', 10);
            const content = prompt.split(':').pop()?.trim() || "No content provided";

            const result = await this.spine.handleCall('pin_to_hexagram', { lineIndex, title, content, state: 2 });
            if (result.ok) {
                return { ok: true, value: { output: `Context pinned to Line ${lineIndex}.`, data: result.value } };
            }
        }

        // NL Parsing: "Consult hexagram", "Check state"
        if (prompt.includes('consult') || prompt.includes('check hexagram') || prompt.includes('status')) {
            const rawContext = await this.manager.formatForPrompt();
            const interpretation = this.manager.getInterpretation();

            return {
                ok: true,
                value: {
                    output: `👑 SOVEREIGN ARCHETYPE: ${interpretation.name}\n${rawContext}\n\n>> TERNARY STRATEGY: ${interpretation.strategy} (Distributed via Local/Edge/Cloud)`,
                    data: {
                        formatted: rawContext,
                        archetype: interpretation.name,
                        strategy: interpretation.strategy,
                        tier: 'Ternary-Substrate'
                    }
                }
            };
        }

        return {
            ok: true,
            value: {
                output: 'Hexagram Memory tools are available. Supported commands: "Pin [Title] to Line [1-6]: [Content]" or "Consult Hexagram".',
                data: { status: 'active' }
            }
        };
    }
}
