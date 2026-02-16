import { BaseLimb } from '../core/BaseLimb.js';
import type { Result, VibeConfig, Execution } from '../../core/models.js';
import { YaoState } from '../../core/models.js';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { VectorDB } from '../../learning/VectorDB.js';

/**
 * EnvironmentLimb - The "Sense Helper" for local environments.
 * 
 * Scans directories for .pog.md context files and integrates them into sovereign memory.
 */
export class EnvironmentLimb extends BaseLimb {
    public id = 'environment';
    public type: 'system' = 'system';

    constructor(
        config: VibeConfig,
        private readonly vectorDB?: VectorDB,
        executor?: import('../../core/ModelExecutor.js').ModelExecutor
    ) {
        super(config, executor);
        this.registerTools([
            {
                name: 'scan_environment',
                description: 'Scans the workspace for .pog.md files and environmental context.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Directory to scan (defaults to projectRoot)' }
                    }
                },
                handler: async (args) => this.handleScanEnvironment(args)
            },
            {
                name: 'ingest_context',
                description: 'Reads and summarizes a .pog.md file, pinning it to the I Ching substrate.',
                parameters: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Path to the .pog.md file' }
                    },
                    required: ['filePath']
                },
                handler: async (args) => this.handleIngestContext(args)
            }
        ]);
    }

    private async handleScanEnvironment(args: Record<string, unknown>): Promise<Result<Execution>> {
        const scanPath = (args['path'] as string) || this.config.projectRoot;
        if (!existsSync(scanPath)) {
            return { ok: false, error: new Error(`Path ${scanPath} does not exist.`) };
        }

        try {
            const files = readdirSync(scanPath);
            const pogFiles = files.filter(f => f.toLowerCase() === '.pog.md' || f.endsWith('.pog.md'));

            if (pogFiles.length === 0) {
                return {
                    ok: true,
                    value: {
                        output: `No .pog.md environmental context files found in ${scanPath}.`,
                        data: { files: [] }
                    }
                };
            }

            return {
                ok: true,
                value: {
                    output: `Found ${pogFiles.length} environmental context files in ${scanPath}:\n${pogFiles.map(f => `- ${f}`).join('\n')}`,
                    data: { files: pogFiles.map(f => join(scanPath, f)) }
                }
            };
        } catch (e) {
            return { ok: false, error: e as Error };
        }
    }

    private async handleIngestContext(args: Record<string, unknown>): Promise<Result<Execution>> {
        const filePath = args['filePath'] as string;
        if (!existsSync(filePath)) {
            return { ok: false, error: new Error(`File ${filePath} not found.`) };
        }

        try {
            const content = readFileSync(filePath, 'utf-8');
            const summary = await this.summarizeContext(content);

            // Pin to Memory (Hexagram Line 2: Vitality/Substrate)
            await this.pinPulse(YaoState.YoungYang, `Ingested environmental context from ${filePath}`);

            if (this.vectorDB) {
                await this.vectorDB.addLesson({
                    id: `env_${Date.now()}`,
                    projectId: this.config.projectId,
                    sessionId: 'environment_sync',
                    text: `ENVIRONMENT CONTEXT [${filePath}]:\n${summary}`,
                    embedding: new Float32Array(this.config.embeddingDimensions || 768).fill(0),
                    createdAt: Date.now(),
                    metadata: { type: 'environment_pog_md', path: filePath },
                    errorType: 'none'
                });
            }

            return {
                ok: true,
                value: {
                    output: `Successfully ingested context from ${filePath}.\n\nSUMMARY:\n${summary}`,
                    data: { summary, path: filePath }
                }
            };
        } catch (e) {
            return { ok: false, error: e as Error };
        }
    }

    private async summarizeContext(content: string): Promise<string> {
        if (!this.executor) return content.substring(0, 1000) + '...';

        const prompt = `Summarize the following environmental context from a .pog.md file. 
Focus on:
1. Core project vision.
2. Architecture rules mentioned.
3. Specific patterns or "Vibes" to maintain.

CONTENT:
${content}`;

        const res = await this.executor.callModel('gemini:gemini-1.5-flash', prompt);
        return res.ok ? res.value.response : content.substring(0, 1000);
    }
}
