/**
 * WebAppForgeLimb - Generates full-stack apps locally
 * Replaces Lovable by using local models + templates + git/test integration
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */

import { BaseLimb } from '../core/BaseLimb.js';
import type { Intent, Execution } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { AdversarialOrchestrator } from '../../core/AdversarialOrchestrator.js';
import { GitManager } from '../../git/GitManager.js';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { PreviewServer } from '../../core/PreviewServer.js';
import { FORGE_TOOLS } from './tools/definitions.js';

const execAsync = promisify(exec);

interface StackTemplate {
    readonly init?: string;
    readonly install?: string;
    readonly devCommand?: string;
    readonly defaultPort?: number;
    readonly description?: string;
}

interface AppBlueprint {
    stack: string;
    name: string;
    features: string[];
    file_count: number;
}

export class WebAppForgeLimb extends BaseLimb {
    readonly id = 'webapp_forge';
    readonly type = 'creative' as const;

    private modelExecutor: ModelExecutor;
    private adversarialOrchestrator: AdversarialOrchestrator;
    private templates: Record<string, StackTemplate>;
    private previewServer: PreviewServer;

    constructor(
        config: VibeConfig,
        previewServer: PreviewServer,
        modelExecutor: ModelExecutor,
        adversarialOrchestrator: AdversarialOrchestrator
    ) {
        super(config);
        this.modelExecutor = modelExecutor;
        this.adversarialOrchestrator = adversarialOrchestrator;
        this.previewServer = previewServer;

        // Load templates
        const potentialPaths = [
            join(this.config.projectRoot, 'src/templates/stacks.json'),
            join(this.config.pogDir, 'stacks.json'),
            join(process.cwd(), 'src/templates/stacks.json')
        ];

        this.templates = {};
        for (const tp of potentialPaths) {
            try {
                if (fs.existsSync(tp)) {
                    this.templates = JSON.parse(fs.readFileSync(tp, 'utf8'));
                    this.logger.debug({ templatePath: tp }, 'Stack templates loaded');
                    break;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        if (Object.keys(this.templates).length === 0) {
            this.logger.warn('No stack templates found, using internal defaults');
            this.templates = {
                "react-vite-internal": {
                    "init": "npx -y create-vite@latest . --template react-ts",
                    "install": "npm install",
                    "devCommand": "npm run dev",
                    "defaultPort": 5173,
                    "description": "Standard React + Vite Starter"
                }
            };
        }

        this.registerForgeTools();
    }

    private registerForgeTools(): void {
        this.registerTools(FORGE_TOOLS.map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
            handler: async (args: any) => {
                try {
                    const output = await t.handler(args);
                    return { ok: true, value: output };
                } catch (e) {
                    return { ok: false, error: e as Error };
                }
            }
        })));
    }

    override async canHandle(intent: Intent): Promise<boolean> {
        const userIntentMatch = intent.prompt.match(/### CURRENT USER INTENT\n([\s\S]*?)\n\n### EXECUTION DIRECTIVE/);
        const rawIntent = (userIntentMatch && userIntentMatch[1]) ? userIntentMatch[1] : intent.prompt;
        const p = rawIntent.toLowerCase();

        const triggers = ['create', 'scaffold', 'generate', 'new', 'make'];
        const targets = ['app', 'website', 'project', 'template', 'starter'];

        const hasTrigger = triggers.some(t => p.includes(t));
        const hasTarget = targets.some(ta => p.includes(ta));
        const isSimpleCode = /\b(function|class|const|let|var|if|return)\b/.test(p);

        return (hasTrigger && hasTarget && !isSimpleCode) ||
            this.spine.getCapabilities().some(cap => p.includes(cap));
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        this.logger.info('🔨 WebApp Forge activated');

        try {
            // 1. Planning Phase (Gemini Flash)
            const blueprint = await this.planApp(intent.prompt);
            this.logger.info({ blueprint }, 'Blueprint created');

            // 2. Execution Phase (Local Tools)
            const projectDir = join(this.config.projectRoot, blueprint.name);

            if (fs.existsSync(projectDir)) {
                return { ok: false, error: new Error(`Project ${blueprint.name} already exists`) };
            }
            fs.mkdirSync(projectDir);

            await this.scaffoldProject(projectDir, blueprint.stack);

            // 3. Git Init
            const projectGit = new GitManager(projectDir);
            await projectGit.initRepo();
            await projectGit.commitChanges('Initial commit by WebApp Forge');

            // 4. Start Preview
            const template = this.templates[blueprint.stack];
            let previewUrl: string | undefined;
            if (template && template.devCommand) {
                const previewResult = await this.previewServer.startPreview(
                    blueprint.name,
                    projectDir,
                    template.devCommand || 'npm run dev',
                    template.defaultPort ?? undefined
                );
                if (previewResult.ok) {
                    previewUrl = previewResult.value.url;
                }
            }

            // 5. Return success
            return {
                ok: true,
                value: {
                    output: `Successfully created ${blueprint.stack} project: ${blueprint.name}${previewUrl ? `\nPreview available at: ${previewUrl}` : ''}`,
                    data: { projectDir, blueprint, previewUrl }
                }
            };

        } catch (error: unknown) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.logger.error({ error: err }, 'WebApp Forge failed');
            return { ok: false, error: err };
        }
    }

    private async planApp(prompt: string): Promise<AppBlueprint> {
        const stacks = Object.keys(this.templates).join(', ');
        const systemPrompt = `You are a scaffold planner. Available stacks: ${stacks}.
    Output ONLY a JSON object with this structure:
    {
      "stack": "one of the available stacks",
      "name": "project-name-kebab-case",
      "features": ["auth", "database", "etc"],
      "file_count": 0
    }`;

        try {
            const fullPrompt = prompt + "\n" + systemPrompt;
            const result = await this.adversarialOrchestrator.generateValidatedCode(
                fullPrompt,
                this.config.criticModel || 'gemini-2.0-flash'
            );

            if (!result.ok) throw result.error;

            const response = result.value.response;
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.warn({ error: e }, 'Validated planning failed, attempting robust single-shot fallback');

            const fallbackResult = await this.modelExecutor.callModel(
                this.config.planningModel || 'gemini-2.0-flash',
                prompt + "\nOutput ONLY the JSON for the project blueprint."
            );

            if (fallbackResult.ok) {
                try {
                    const jsonStr = fallbackResult.value.response.replace(/```json/g, '').replace(/```/g, '').trim();
                    return JSON.parse(jsonStr);
                } catch (parseError) {
                    this.logger.error({ parseError }, 'Single-shot fallback JSON parse failed');
                }
            }

            return {
                stack: 'react-vite-internal',
                name: 'pog-app-' + Date.now(),
                features: ['sovereign-ui', 'responsive-layout', 'pog-integration'],
                file_count: 12
            };
        }
    }


    private async scaffoldProject(dir: string, stackKey: string): Promise<void> {
        const template = this.templates[stackKey];
        if (!template) throw new Error(`Unknown stack: ${stackKey}`);

        this.logger.info(`Scaffolding ${stackKey} in ${dir}`);

        if (template.init) {
            await execAsync(template.init, { cwd: dir });
        }

        if (template.install) {
            await execAsync(template.install, { cwd: dir });
        }
    }
}

