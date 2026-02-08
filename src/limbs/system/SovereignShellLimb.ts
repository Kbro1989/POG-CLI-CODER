import { execSync } from 'child_process';
import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import type { Result, VibeConfig } from '../../core/models.js';
import { HealthRegistry } from '../../core/HealthRegistry.js';

/**
 * SovereignShellLimb - Robust terminal-based fallback layer.
 * 
 * Provides CLI-level access to Gemini, GCloud, and Cloudflare tools
 * as a redundancy path for programmatic API failures.
 */
export class SovereignShellLimb extends BaseLimb {
    id = 'sovereign-shell';
    type = 'maintenance' as const;

    constructor(config: VibeConfig) {
        super(config);
        this.registerSovereignTools();

        // Register health provider with the central registry
        HealthRegistry.getInstance().registerProvider(this.id, () => this.getHealth());
    }

    private getHealth() {
        // Simple verification for the presence of global binaries
        const bins = ['gemini', 'gcloud', 'wrangler', 'ssh'];
        let availableCount = 0;
        const metadata: Record<string, boolean> = {};

        for (const bin of bins) {
            try {
                // Use 'where' on Windows to locate binary
                execSync(`where ${bin}`, { stdio: 'ignore' });
                availableCount++;
                metadata[bin] = true;
            } catch {
                metadata[bin] = false;
            }
        }

        return {
            state: availableCount > 0 ? 'READY' : 'CRITICAL_FAILURE' as any,
            cooldownSeconds: 0,
            metadata
        };
    }

    private registerSovereignTools() {
        this.registerTools([
            {
                name: 'gemini_cli_exec',
                description: 'Execute global gemini CLI code editor command for high-fidelity fallback edits.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for the gemini command (e.g., "apply --file ...")' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async ({ args }) => this.runCommand(`gemini ${args}`)
            },
            {
                name: 'gcloud_global_exec',
                description: 'Execute gcloud -g global command for Cloud resource management.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for gcloud -g' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async ({ args }) => this.runCommand(`gcloud -g ${args}`)
            },
            {
                name: 'wrangler_global_exec',
                description: 'Execute wrangler -g global command for Cloudflare Worker/Static site orchestration.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for wrangler -g' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async ({ args }) => this.runCommand(`wrangler -g ${args}`)
            },
            {
                name: 'github_ssh_exec',
                description: 'Execute ssh github -g global command for secure repository operations.',
                parameters: {
                    type: 'object',
                    properties: {
                        args: { type: 'string', description: 'Arguments for ssh github -g' }
                    },
                    required: ['args']
                },
                schema: z.object({ args: z.string() }),
                handler: async ({ args }) => this.runCommand(`ssh github -g ${args}`)
            }
        ]);
    }

    private async runCommand(command: string): Promise<Result<string>> {
        try {
            this.logger.info({ command }, 'Executing Sovereign Shell Fallback');
            // Using synchronous execution for simplicity in fallback mode, 
            // but wrapped in an async handler for Spine compatibility.
            const output = execSync(command, { encoding: 'utf8' });
            return { ok: true, value: output };
        } catch (error: any) {
            this.logger.error({ command, error: error.message }, 'Sovereign Shell Execution Failed');
            return { ok: false, error: new Error(error.stdout || error.stderr || error.message) };
        }
    }
}
