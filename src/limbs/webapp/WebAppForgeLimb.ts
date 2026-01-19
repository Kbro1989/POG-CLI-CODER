/**
 * WebAppForgeLimb - Generates full-stack apps locally
 * Replaces Lovable by using local models + templates + git/test integration
 */

import { NeuralLimb, Intent, Execution } from '../core/NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { GeminiService, GeminiConfig } from '../../core/GeminiService.js';
import { GitManager } from '../../git/GitManager.js';
import { TestRunner } from '../../testing/TestRunner.js';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import pino from 'pino';
import { PreviewServer } from '../../core/PreviewServer.js';

const execAsync = promisify(exec);
const logger = pino({
    name: 'WebAppForge',
    base: { hostname: 'POG-VIBE' }
});

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

export class WebAppForgeLimb implements NeuralLimb {
    id = 'webapp_forge';
    type = 'creative' as const;
    capabilities = ['scaffold_project', 'generate_frontend', 'generate_backend', 'setup_database'];

    private gemini: GeminiService;
    private git: GitManager;
    private tester: TestRunner;
    private templates: Record<string, StackTemplate>;
    private previewServer: PreviewServer;

    constructor(private config: VibeConfig, previewServer: PreviewServer) {
        const apiKey = process.env['GOOGLE_API_KEY'] || '';
        const geminiConfig: GeminiConfig = { apiKey, modelName: 'gemini-2.0-flash' };
        this.gemini = new GeminiService(geminiConfig);
        this.git = new GitManager(config.pogDir);
        this.tester = new TestRunner(config.projectRoot); // Use projectRoot for tester
        this.previewServer = previewServer;

        // Silence unused warnings for now (reserved for Phase 2: Execution)
        logger.debug({ gitCtx: !!this.git, testCtx: !!this.tester }, 'Limb initialized');

        // Load templates
        // Load templates from multiple potential locations
        const potentialPaths = [
            join(this.config.projectRoot, 'src/templates/stacks.json'),
            join(this.config.pogDir, 'stacks.json'), // Shared location
            join(process.cwd(), 'src/templates/stacks.json')
        ];

        this.templates = {};
        for (const tp of potentialPaths) {
            try {
                if (fs.existsSync(tp)) {
                    this.templates = JSON.parse(fs.readFileSync(tp, 'utf8'));
                    logger.debug({ templatePath: tp }, 'Stack templates loaded');
                    break;
                }
            } catch (e) {
                // Continue to next path
            }
        }

        if (Object.keys(this.templates).length === 0) {
            logger.warn('No stack templates found, using internal defaults');
            // Inline basic fallback to ensure Gamma-level functionality
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
    }

    async canHandle(intent: Intent): Promise<boolean> {
        // High-Fidelity Intent Guard: Only look at the user intent section
        // to avoid triggering on system prompt words like "generate" or "create"
        const userIntentMatch = intent.prompt.match(/### CURRENT USER INTENT\n([\s\S]*?)\n\n### EXECUTION DIRECTIVE/);
        const rawIntent = (userIntentMatch && userIntentMatch[1]) ? userIntentMatch[1] : intent.prompt;
        const p = rawIntent.toLowerCase();

        const triggers = ['create', 'scaffold', 'generate', 'new', 'make'];
        const targets = ['app', 'website', 'project', 'template', 'starter'];

        // Logic Gate: Must have a structural trigger AND a structural target.
        // It must NOT look like a simple function or variable snippet.
        const hasTrigger = triggers.some(t => p.includes(t));
        const hasTarget = targets.some(ta => p.includes(ta));
        const isSimpleCode = /\b(function|class|const|let|var|if|return)\b/.test(p);

        return hasTrigger && hasTarget && !isSimpleCode;
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        logger.info('🔨 WebApp Forge activated');

        try {
            // 1. Planning Phase (Gemini Flash)
            const blueprint = await this.planApp(intent.prompt);
            logger.info({ blueprint }, 'Blueprint created');

            // 2. Execution Phase (Local Tools)
            // Use projectRoot (Current Working Directory) for project creation
            const projectDir = join(this.config.projectRoot, blueprint.name);

            // Removed internal 'projects' directory creation as we now use CWD

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
                    blueprint.name, // Assuming projectName should be blueprint.name
                    projectDir,     // Assuming projectPath should be projectDir
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
            logger.error({ error: err }, 'WebApp Forge failed');
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
            const result = await this.gemini.generateContent(prompt + "\n" + systemPrompt);
            if (!result.ok) throw result.error;

            const response = result.value.response;
            // Clean markdown code blocks if present
            const jsonStr = response.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);
        } catch (e) {
            // Fallback
            logger.warn('Planning failed, falling back to default');
            return {
                stack: 'react-vite-internal',
                name: 'generated-app-' + Date.now(),
                features: [],
                file_count: 5
            };
        }
    }

    private async scaffoldProject(dir: string, stackKey: string): Promise<void> {
        const template = this.templates[stackKey];
        if (!template) throw new Error(`Unknown stack: ${stackKey}`);

        logger.info(`Scaffolding ${stackKey} in ${dir}`);

        // Run init command
        if (template.init) {
            await execAsync(template.init, { cwd: dir });
        }

        // Run install command
        if (template.install) {
            await execAsync(template.install, { cwd: dir });
        }
    }
}
