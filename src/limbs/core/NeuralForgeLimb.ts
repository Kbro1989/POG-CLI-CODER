import { BaseLimb } from './BaseLimb.js';
import { VibeConfig } from '../../core/models.js';
import { AdversarialOrchestrator } from '../../core/AdversarialOrchestrator.js';

/**
 * NeuralForgeLimb - Specialized high-tier creation for SQL, Docs, and Refactoring.
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class NeuralForgeLimb extends BaseLimb {
    id = 'neural_forge';
    type = 'creative' as const;

    constructor(
        config: VibeConfig,
        private readonly adversarialOrchestrator: AdversarialOrchestrator
    ) {
        super(config);
        this.registerForgeTools();
    }

    private registerForgeTools(): void {
        this.registerTools([
            {
                name: 'forge_request',
                description: 'Request specialized output from the SQL, Docs, or Refactor forges.',
                parameters: {
                    type: 'object',
                    properties: {
                        forgeType: { type: 'string', enum: ['SQL', 'Docs', 'Refactor'], description: 'The specialized forge to use' },
                        prompt: { type: 'string', description: 'The specific task for the forge' }
                    },
                    required: ['forgeType', 'prompt']
                },
                handler: async (args) => {
                    const targetForge = args.forgeType;
                    let persona = 'Architectural Engineer';

                    if (targetForge === 'SQL') persona = 'SQL Architect';
                    else if (targetForge === 'Docs') persona = 'Technical Writer';

                    const specializedPrompt = this.wrapForgePrompt(persona, args.prompt);
                    this.logger.info({ targetForge }, 'Executing specialized forge loop (Adversarial)');

                    const result = await this.adversarialOrchestrator.generateValidatedCode(
                        specializedPrompt,
                        this.config.criticModel || 'gemini:gemini-3-pro-preview'
                    );

                    if (!result.ok) return result;

                    return {
                        ok: true,
                        value: `### Neural ${targetForge} Forge Result\n\n${result.value.response}`
                    };
                }
            }
        ]);
    }

    private wrapForgePrompt(persona: string, prompt: string): string {
        return `
ROLE: ${persona}
GOAL: Professional grade output with ZERO placeholders and ZERO mocks.
CONTEXT: High-performance intelligence substrate.

TASK:
${prompt}

REQUIREMENTS:
1. Output MUST be production-ready.
2. If SQL: Ensure migrations are safe and optimized.
3. If Docs: Use clear, technical, and precise language.
4. If Refactor: Prioritize readability and performance without breaking functionality.

GENERATE IMPLEMENTATION NOW:
`;
    }

    override async canHandle(intent: import('./NeuralLimb.js').Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();
        const forgeMatch = /sql\s+forge|docs\s+forge|refactor\s+forge/i.test(p);
        const patterns = ['migration', 'database schema', 'technical deep-dive', 'code smell', 'refactor', 'api reference'];
        return forgeMatch || patterns.some(pattern => p.includes(pattern));
    }
}
