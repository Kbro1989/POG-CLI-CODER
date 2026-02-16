import { spawn, ChildProcess } from 'child_process';
import { z } from 'zod';
import type { Result, VibeConfig, LimbTool } from '../../core/models.js';

/**
 * ShellSpine - Sovereign shell execution and process management (CLI Bundle).
 */
export class ShellSpine {
    private readonly activeProcesses: Set<ChildProcess> = new Set();

    constructor(private readonly config: VibeConfig) { }

    getTools(): LimbTool[] {
        return [
            {
                name: 'sh_exec',
                description: 'Execute a shell command within the project root.',
                parameters: {
                    type: 'object',
                    properties: {
                        command: { type: 'string', description: 'The shell command to run.' },
                        args: { type: 'array', items: { type: 'string' }, description: 'Optional arguments.' }
                    },
                    required: ['command']
                },
                schema: z.object({
                    command: z.string().describe('The shell command to run.'),
                    args: z.array(z.string()).optional().describe('Optional arguments.')
                }),
                handler: async (args: Record<string, unknown>) => {
                    const command = args['command'] as string;
                    const cmdArgs = (args['args'] as string[]) || [];
                    return this.execute(command, cmdArgs);
                }
            },
            {
                name: 'sh_yolo',
                description: 'Execute high-creativity reasoning using the unrestricted YOLO substrate.',
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'The creative prompt for the YOLO subsystem.' }
                    },
                    required: ['prompt']
                },
                schema: z.object({
                    prompt: z.string().describe('The creative prompt for the YOLO subsystem.')
                }),
                handler: async (args: Record<string, unknown>) => {
                    const prompt = args['prompt'] as string;
                    return this.execute('gemini', ['--yolo', prompt]);
                }
            },
            {
                name: 'sh_gemini_cli',
                description: 'Execute global gemini CLI code editor command.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for the gemini command.' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async (args: Record<string, unknown>) => {
                    return this.execute('gemini', [(args['args'] as string)]);
                }
            },
            {
                name: 'sh_gcloud',
                description: 'Execute global gcloud command for resource management.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for gcloud command.' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async (args: Record<string, unknown>) => {
                    return this.execute('gcloud', [(args['args'] as string)]);
                }
            },
            {
                name: 'sh_wrangler',
                description: 'Execute global wrangler command for Cloudflare orchestration.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for wrangler command.' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async (args: Record<string, unknown>) => {
                    return this.execute('wrangler', [(args['args'] as string)]);
                }
            },
            {
                name: 'sh_ssh_github',
                description: 'Execute global ssh github command for secure repository operations.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for ssh command.' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async (args: Record<string, unknown>) => {
                    return this.execute('ssh', ['github', (args['args'] as string)]);
                }
            }
        ];
    }

    private async execute(command: string, args: string[], retries = 2): Promise<Result<{ stdout: string; stderr: string; exitCode: number }>> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            const result = await new Promise<Result<{ stdout: string; stderr: string; exitCode: number }>>((resolve) => {
                const child = spawn(command, args, {
                    cwd: this.config.projectRoot,
                    shell: true,
                    env: {
                        ...process.env,
                        POG_AI_CONTEXT_PATH: this.config.aiContextPath,
                        VIBE_USER_EMAIL: this.config.identity?.email,
                        VIBE_IDENTITY_NAME: this.config.identity?.name,
                        POG_ROOT_STACK: JSON.stringify(this.config.rootStack)
                    }
                });

                this.activeProcesses.add(child);
                let stdout = '';
                let stderr = '';

                child.stdout?.on('data', (data) => { stdout += data.toString(); });
                child.stderr?.on('data', (data) => { stderr += data.toString(); });

                child.on('close', (code) => {
                    this.activeProcesses.delete(child);
                    resolve({
                        ok: true,
                        value: { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code || 0 }
                    });
                });

                child.on('error', (err) => {
                    this.activeProcesses.delete(child);
                    resolve({ ok: false, error: err });
                });
            });

            if (result.ok) return result;
            if (attempt === retries) {
                // Final Unfailing attempt: execSync (blocks but robust)
                try {
                    const fullCmd = `${command} ${args.join(' ')}`;
                    const stdout = (import('child_process') as any).execSync(fullCmd, { cwd: this.config.projectRoot, encoding: 'utf8', stdio: 'pipe' });
                    return { ok: true, value: { stdout: stdout.trim(), stderr: '', exitCode: 0 } };
                } catch (error) {
                    return { ok: false, error: error as Error };
                }
            }
            // Small delay before retry
            await new Promise(r => setTimeout(r, 500));
        }
        return { ok: false, error: new Error('Maximum retries exceeded') };
    }

    public async close(): Promise<void> {
        for (const child of this.activeProcesses) {
            if (child.exitCode === null) {
                child.kill();
            }
        }
        this.activeProcesses.clear();
    }
}
