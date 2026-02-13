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
    private readonly state = StateManager.getInstance();

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
                handler: async (args: Record<string, unknown>) => this.gitCommit(args['message'] as string)
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
                handler: async (args: Record<string, unknown>) => this.npmInstall(args['packages'] as string[], args['saveDev'] as boolean)
            },
            {
                name: 'git_push',
                description: 'Push committed changes to the remote branch (Ternary Orchestration).',
                parameters: { type: 'object', properties: {} },
                handler: async () => this.gitPush()
            },
            {
                name: 'git_pull',
                description: 'Pull and merge changes from the remote branch.',
                parameters: { type: 'object', properties: {} },
                handler: async () => this.gitPull()
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
                handler: async (args: Record<string, unknown>) => this.scaffold(args['name'] as string, args['type'] as 'worker' | 'component' | 'minimal')
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
            execSync('git add .', {
                cwd: this.config.projectRoot
            });
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

    private async gitPush(): Promise<Result<string>> {
        try {
            const output = execSync('git push', { cwd: this.config.projectRoot, encoding: 'utf-8' });
            return { ok: true, value: output || 'Pushed successfully' };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async gitPull(): Promise<Result<string>> {
        try {
            const output = execSync('git pull', { cwd: this.config.projectRoot, encoding: 'utf-8' });
            return { ok: true, value: output || 'Pulled successfully' };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        const p = intent.prompt.toLowerCase();

        if (p.includes('status') || p.includes('git')) {
            const matchedCap = this.spine.getCapabilities().find(cap => p.includes(cap));
            if (matchedCap) {
                return (this.spine as unknown as { handleCall: (name: string, args: Record<string, unknown>) => Promise<Result<Execution>> }).handleCall(matchedCap, {});
            }
        }

        return super.execute(intent);
    }
}
