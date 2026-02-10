import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import { VibeConfig, Result } from '../../core/models.js';
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
                        forgeType: { type: 'string', enum: ['SQL', 'Docs', 'Refactor', 'UI', 'PatternScope'], description: 'The specialized forge to use' },
                        prompt: { type: 'string', description: 'The specific task for the forge' }
                    },
                    required: ['forgeType', 'prompt']
                },
                handler: async (args: any) => {
                    const targetForge = args['forgeType'];
                    let persona = 'Architectural Engineer';

                    if (targetForge === 'SQL') persona = 'SQL Architect';
                    else if (targetForge === 'Docs') persona = 'Technical Writer';
                    else if (targetForge === 'UI') persona = 'Sovereign UI/UX Architect';
                    else if (targetForge === 'PatternScope') persona = 'Code Provenance Auditor';

                    const specializedPrompt = this.wrapForgePrompt(persona, args['prompt']);
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
            },
            {
                name: 'harvest_pattern',
                description: 'Analyze a file, extract a reusable pattern, and inject it into the Sovereign Library.',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Absolute path to the file to harvest' },
                        patternName: { type: 'string', description: 'Name for the harvested pattern (e.g., AUTH_LOGIN)' },
                        description: { type: 'string', description: 'Description of the pattern logic' }
                    },
                    required: ['filePath', 'patternName', 'description']
                },
                handler: async (args) => {
                    return this.handleHarvestPattern(args);
                }
            }
        ]);
    }

    private async handleHarvestPattern(args: any): Promise<Result<string>> {
        const { filePath, patternName, description } = args;
        const fs = await import('fs');
        const path = await import('path');

        if (!fs.existsSync(filePath)) {
            return { ok: false, error: new Error(`File not found: ${filePath}`) };
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Use PatternScope Forge to clean and template the code
        const harvestPrompt = `HARVEST TARGET: ${filePath}
PATTERN NAME: ${patternName}
DESCRIPTION: ${description}

SOURCE CODE:
${fileContent}

TASK: 
1. Analyze the code for high-quality, reusable patterns.
2. Remove any specific business logic or hardcoded values, replacing them with generic placeholders if necessary (but prefer prop-driven components).
3. Ensure it strictly follows Sovereign Laws (No Placeholders, Types Safe).
4. Output ONLY the clean, templated TypeScript/React code.`;

        const result = await this.adversarialOrchestrator.generateValidatedCode(
            this.wrapForgePrompt('Code Provenance Auditor', harvestPrompt),
            this.config.criticModel || 'gemini-2.0-flash'
        );

        if (!result.ok) return { ok: false, error: result.error };

        const cleanedCode = result.value.response.replace(/```tsx?/g, '').replace(/```/g, '').trim();

        // Inject into SovereignLibrary.ts
        // This is a "hot patch" append for now, demonstrating predatory growth
        const libPath = path.join(this.config.projectRoot, 'src', 'limbs', 'webapp', 'SovereignLibrary.ts');

        if (fs.existsSync(libPath)) {
            let libContent = fs.readFileSync(libPath, 'utf8');
            // Remove the last closing brace and semicolon or just the last closing brace
            libContent = libContent.trim().replace(/};?\s*$/, '');

            const newEntry = `,\n  ${patternName}: \`\n${cleanedCode}\n\`\n};\n`;

            fs.writeFileSync(libPath, libContent + newEntry);
            this.logger.info({ patternName }, 'Harvested and injected pattern into Sovereign Library');

            return { ok: true, value: `Successfully harvested ${patternName}. It is now part of the Sovereign Substrate.` };
        }

        return { ok: false, error: new Error('SovereignLibrary.ts not found for injection.') };
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

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        // +1: Explicit forge match = optimal
        const forgeMatch = /sql\s+forge|docs\s+forge|refactor\s+forge/i.test(userIntent);
        if (forgeMatch) return 1;

        // 0: Common patterns = maybe
        const patterns = ['migration', 'database schema', 'technical deep-dive', 'code smell', 'refactor', 'api reference'];
        if (patterns.some(pattern => userIntent.includes(pattern))) return 0;

        return -1;
    }
    override async execute(intent: Intent): Promise<Result<Execution>> {
        const userIntent = this.getUserIntent(intent).toLowerCase();
        const matchedCap = this.spine.getCapabilities().find(cap => userIntent.includes(cap));

        if (matchedCap) {
            return this.spine.handleCall(matchedCap, { forgeType: 'SQL', prompt: intent.prompt }) as any; // Default to SQL for now if auto-matched
        }

        // Fallback to Sovereign Cognitive Response
        return super.execute(intent);
    }
}
