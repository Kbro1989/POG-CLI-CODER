/**
 * FileSystemLimb - Atomic file operations for Sovereign AI
 */

import { NeuralLimb, Intent, Execution } from './NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { Sandbox } from '../../sandbox/Sandbox.js';
import * as fs from 'fs';
import { join, relative } from 'path';
import pino from 'pino';

const logger = pino({
    name: 'FileSystemLimb',
    base: { hostname: 'POG-VIBE' }
});

export class FileSystemLimb implements NeuralLimb {
    id = 'filesystem';
    type = 'maintenance' as const;
    capabilities = ['read_file', 'write_file', 'patch_file', 'list_files', 'rollback_snapshot'];

    constructor(
        private readonly config: VibeConfig,
        private readonly sandbox: Sandbox
    ) { }

    async canHandle(intent: Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();
        return p.includes('read') || p.includes('write') || p.includes('edit file') || p.includes('persistence') || p.includes('rollback');
    }

    async execute(_intent: Intent): Promise<Result<Execution>> {
        return { ok: false, error: new Error('Use formal tool calls for FileSystem operations.') };
    }

    getTools(): any[] {
        return [{
            functionDeclarations: [
                {
                    name: 'read_file',
                    description: 'Read the contents of a file from the project root.',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Relative path to the file.' }
                        },
                        required: ['path']
                    }
                },
                {
                    name: 'write_file',
                    description: 'Overwrite a file with new content. Automatically creates a sandbox snapshot.',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Relative path to the file.' },
                            content: { type: 'string', description: 'The new content of the file.' }
                        },
                        required: ['path', 'content']
                    }
                },
                {
                    name: 'patch_file',
                    description: 'Replace a specific block of text in a file.',
                    parameters: {
                        type: 'object',
                        properties: {
                            path: { type: 'string', description: 'Relative path to the file.' },
                            search: { type: 'string', description: 'The exact string to search for.' },
                            replace: { type: 'string', description: 'The string to replace it with.' }
                        },
                        required: ['path', 'search', 'replace']
                    }
                },
                {
                    name: 'list_files',
                    description: 'List files in a directory recursively.',
                    parameters: {
                        type: 'object',
                        properties: {
                            dir: { type: 'string', description: 'Relative directory path (defaults to root).' }
                        }
                    }
                },
                {
                    name: 'rollback_snapshot',
                    description: 'Rollback the project state to a previous snapshot (Ollama Review Mode).',
                    parameters: {
                        type: 'object',
                        properties: {
                            snapshotId: { type: 'string', description: 'The ID of the snapshot to restore.' }
                        },
                        required: ['snapshotId']
                    }
                }
            ]
        }];
    }

    async handleToolCall(name: string, args: any): Promise<Result<any>> {
        const relPath = args.path || '';
        const absPath = join(this.config.projectRoot, relPath);

        try {
            switch (name) {
                case 'read_file':
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${relPath}`);
                    return { ok: true, value: fs.readFileSync(absPath, 'utf8') };

                case 'write_file':
                    // 1. Create snapshot before writing (As requested: Snapshot for review/rollback)
                    const snapshot = await this.sandbox.createSnapshot(`write_file: ${relPath}`);
                    fs.writeFileSync(absPath, args.content);
                    return { ok: true, value: { status: 'persisted', snapshotId: snapshot.ok ? snapshot.value : 'none' } };

                case 'patch_file':
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${relPath}`);
                    const content = fs.readFileSync(absPath, 'utf8');
                    if (!content.includes(args.search)) throw new Error('Search string not found in file - aborting patch.');

                    await this.sandbox.createSnapshot(`patch_file: ${relPath}`);
                    const newContent = content.replace(args.search, args.replace);
                    fs.writeFileSync(absPath, newContent);
                    return { ok: true, value: { status: 'patched' } };

                case 'list_files':
                    const dir = join(this.config.projectRoot, args.dir || '');
                    const files = this.walk(dir).map(f => relative(this.config.projectRoot, f));
                    return { ok: true, value: files };

                case 'rollback_snapshot':
                    const rbResult = await this.sandbox.rollback(args.snapshotId);
                    if (!rbResult.ok) throw rbResult.error;
                    return { ok: true, value: { status: 'rolled_back', snapshotId: args.snapshotId } };

                default:
                    return { ok: false, error: new Error(`Unknown FileSystem tool: ${name}`) };
            }
        } catch (error) {
            logger.error({ name, args, error }, 'FileSystem tool execution failed');
            return { ok: false, error: error as Error };
        }
    }

    private walk(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        for (let file of list) {
            if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.pog') continue;
            file = join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(this.walk(file));
            } else {
                results.push(file);
            }
        }
        return results;
    }
}
