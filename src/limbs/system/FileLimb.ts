import { BaseLimb } from '../core/BaseLimb.js';
import type { Intent, Execution } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { StateManager } from '../../core/StateManager.js';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

/**
 * FileLimb - Advanced File System Substrate
 * 
 * Provides Git, NPM, and Scaffolding capabilities to the Sovereign Supervisor.
 */
export class FileLimb extends BaseLimb {
    readonly id = 'file_limb';
    readonly type = 'maintenance';
    private state = StateManager.getInstance();

    constructor(config: VibeConfig) {
        super(config);
        this.registerTools([
            {
                name: 'git_status',
                description: 'Checks the current Git status of the project root.',
                parameters: { type: 'object', properties: {} },
                handler: async () => this.gitStatus()
            },
            {
                name: 'git_commit',
                description: 'Adds all changes and commits them with a message.',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The commit message' }
                    },
                    required: ['message']
                },
                schema: z.object({ message: z.string() }),
                handler: async (args) => this.gitCommit(args.message)
            },
            {
                name: 'npm_install',
                description: 'Installs dependencies in the current project root.',
                parameters: {
                    type: 'object',
                    properties: {
                        packages: { type: 'array', items: { type: 'string' }, description: 'Optional list of packages' },
                        saveDev: { type: 'boolean', description: 'Install as dev dependency' }
                    }
                },
                schema: z.object({ packages: z.array(z.string()).optional(), saveDev: z.boolean().optional() }),
                handler: async (args) => this.npmInstall(args.packages, args.saveDev)
            },
            {
                name: 'template_scaffold',
                description: 'Scaffolds a new project component or sub-service based on ultimate templates.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'The name of the new directory' },
                        type: { type: 'string', enum: ['worker', 'component', 'minimal'], description: 'The template type' }
                    },
                    required: ['name', 'type']
                },
                schema: z.object({ name: z.string(), type: z.enum(['worker', 'component', 'minimal']) }),
                handler: async (args) => this.scaffold(args.name, args.type)
            }
        ]);
    }

    private async gitStatus(): Promise<Result<string>> {
        try {
            const output = execSync('git status --short', { cwd: this.config.projectRoot, encoding: 'utf-8' });
            return { ok: true, value: output || 'Clean' };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async gitCommit(message: string): Promise<Result<string>> {
        try {
            execSync('git add .', { cwd: this.config.projectRoot });
            const output = execSync(`git commit -m "[Sovereign] ${message}"`, { cwd: this.config.projectRoot, encoding: 'utf-8' });
            this.state.updateMetrics({ turnCount: 1 });
            return { ok: true, value: output };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async npmInstall(packages?: string[], saveDev?: boolean): Promise<Result<string>> {
        try {
            const cmd = `npm install ${packages?.join(' ') || ''} ${saveDev ? '--save-dev' : ''}`;
            const output = execSync(cmd, { cwd: this.config.projectRoot, encoding: 'utf-8' });
            return { ok: true, value: output };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async scaffold(name: string, type: 'worker' | 'component' | 'minimal'): Promise<Result<string>> {
        const targetDir = join(this.config.projectRoot, name);
        if (existsSync(targetDir)) return { ok: false, error: new Error(`Directory ${name} already exists`) };

        try {
            mkdirSync(targetDir, { recursive: true });

            if (type === 'worker') {
                writeFileSync(join(targetDir, 'package.json'), JSON.stringify({ name, version: '1.0.0', type: 'module' }, null, 2));
                writeFileSync(join(targetDir, 'wrangler.toml'), `name = "${name}"\nmain = "src/index.ts"\ncompatibility_date = "2025-10-11"`);
                mkdirSync(join(targetDir, 'src'));
                writeFileSync(join(targetDir, 'src/index.ts'), `export default { async fetch() { return new Response("Hello from ${name}"); } };`);
            } else if (type === 'minimal') {
                writeFileSync(join(targetDir, 'index.js'), `console.log("Sovereign Minimal [${name}] Active");`);
            }

            return { ok: true, value: `Scaffolded ${type} project in ${name}` };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        const p = intent.prompt.toLowerCase();

        if (p.includes('status') || p.includes('git')) {
            const status = await this.gitStatus();
            if (status.ok) return { ok: true, value: { output: status.value } };
        }

        return super.execute(intent);
    }
}
