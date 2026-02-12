import { BaseLimb } from './BaseLimb.js';
import { z } from 'zod';
import { VibeConfig } from '../../core/models.js';
import { Sandbox } from '../../sandbox/Sandbox.js';
import * as fs from 'fs';
import { join, relative } from 'path';
import { SmartEdit } from '../../core/SmartEdit.js';
import { readManyFiles } from '../../utils/ReadManyFiles.js';

/**
 * FileSystemLimb - Atomic file operations for Sovereign AI
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class FileSystemLimb extends BaseLimb {
    readonly id = 'filesystem';
    readonly type = 'maintenance' as const;

    constructor(
        config: VibeConfig,
        private readonly sandbox: Sandbox
    ) {
        super(config);
        this.registerFileSystemTools();
    }

    private registerFileSystemTools(): void {
        this.registerTools([
            {
                name: 'read_file',
                description: 'Read the contents of a file from the project root.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file.' }
                    },
                    required: ['path']
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args['path']}`);
                    return { ok: true, value: fs.readFileSync(absPath, 'utf8') };
                }
            },
            {
                name: 'read_many_files',
                description: 'Read multiple files in a single turn. Optimization for batch processing.',
                parameters: {
                    type: 'object',
                    properties: {
                        paths: { type: 'array', items: { type: 'string' }, description: 'Array of relative file paths.' }
                    },
                    required: ['paths']
                },
                schema: z.object({
                    paths: z.array(z.string()).describe('Array of relative file paths.')
                }),
                handler: async (args: any) => {
                    const absPaths = args['paths'].map((p: string) => join(this.config.projectRoot, p));
                    return await readManyFiles(absPaths);
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
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file.'),
                    content: z.string().describe('The new content of the file.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    const snapshot = await this.sandbox.createSnapshot(`write_file: ${args['path']}`);
                    fs.writeFileSync(absPath, args['content']);
                    return { ok: true, value: { status: 'persisted', snapshotId: snapshot.ok ? snapshot.value : 'none' } };
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
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file.'),
                    search: z.string().describe('The exact string to search for.'),
                    replace: z.string().describe('The string to replace it with.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args['path']}`);

                    const content = fs.readFileSync(absPath, 'utf8');
                    const editResult = await SmartEdit.calculateReplacement(content, {
                        file_path: absPath,
                        old_string: args['search'],
                        new_string: args['replace']
                    });

                    if (editResult.occurrences === 0) {
                        throw new Error(`Patch failed: Search string not found in file (Strategies: Exact|Flexible|Regex failed).`);
                    }

                    await this.sandbox.createSnapshot(`patch_file: ${args['path']} (Strategy: ${editResult.strategy})`);
                    const finalContent = SmartEdit.restoreTrailingNewline(content, editResult.newContent);
                    fs.writeFileSync(absPath, finalContent);

                    return { ok: true, value: { status: 'patched', strategy: editResult.strategy, occurrences: editResult.occurrences } };
                }
            },
            {
                name: 'smart_edit',
                description: 'Advanced file editing with multiple matching strategies (Exact, Flexible, Regex). Use for complex refactors where indentation might vary.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file.' },
                        old_string: { type: 'string', description: 'The text block to replace.' },
                        new_string: { type: 'string', description: 'The new text block.' },
                        instruction: { type: 'string', description: 'Instruction for the edit (used for self-correction logs).' }
                    },
                    required: ['path', 'old_string', 'new_string']
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file.'),
                    old_string: z.string().describe('The text block to replace.'),
                    new_string: z.string().describe('The new text block.'),
                    instruction: z.string().optional().describe('Instruction for the edit.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args['path']}`);

                    const content = fs.readFileSync(absPath, 'utf8');
                    const result = await SmartEdit.calculateReplacement(content, {
                        file_path: absPath,
                        old_string: args['old_string'],
                        new_string: args['new_string']
                    });

                    if (result.occurrences === 0) {
                        return { ok: false, error: new Error('SmartEdit failed to find matching content for provided old_string.') };
                    }

                    await this.sandbox.createSnapshot(`smart_edit: ${args['path']}`);
                    const finalContent = SmartEdit.restoreTrailingNewline(content, result.newContent);
                    fs.writeFileSync(absPath, finalContent);

                    return { ok: true, value: { status: 'edited', strategy: result.strategy, occurrences: result.occurrences } };
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
                },
                schema: z.object({
                    dir: z.string().optional().describe('Relative directory path (defaults to root).')
                }),
                handler: async (args: any) => {
                    const dir = join(this.config.projectRoot, args['dir'] || '');
                    const files = this.walk(dir).map(f => relative(this.config.projectRoot, f));
                    return { ok: true, value: files };
                }
            },
            {
                name: 'create_directory',
                description: 'Create a new directory recursively within the project root.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative directory path to create.' }
                    },
                    required: ['path']
                },
                schema: z.object({
                    path: z.string().describe('Relative directory path to create.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    if (fs.existsSync(absPath)) return { ok: true, value: { status: 'exists' } };
                    fs.mkdirSync(absPath, { recursive: true });
                    return { ok: true, value: { status: 'created', path: args['path'] } };
                }
            },
            {
                name: 'delete_file',
                description: 'Safe removal of a file within the project root. Checks existence first.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file to delete.' }
                    },
                    required: ['path']
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file to delete.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args['path']}`);
                    fs.unlinkSync(absPath);
                    return { ok: true, value: { status: 'deleted', path: args['path'] } };
                }
            },
            {
                name: 'move_file',
                description: 'Atomic move or rename of a file or directory.',
                parameters: {
                    type: 'object',
                    properties: {
                        source: { type: 'string', description: 'Relative source path.' },
                        destination: { type: 'string', description: 'Relative destination path.' }
                    },
                    required: ['source', 'destination']
                },
                schema: z.object({
                    source: z.string().describe('Relative source path.'),
                    destination: z.string().describe('Relative destination path.')
                }),
                handler: async (args: any) => {
                    const srcAbs = join(this.config.projectRoot, args['source']);
                    const dstAbs = join(this.config.projectRoot, args['destination']);
                    if (!fs.existsSync(srcAbs)) throw new Error(`Source not found: ${args['source']}`);
                    fs.renameSync(srcAbs, dstAbs);
                    return { ok: true, value: { status: 'moved', from: args['source'], to: args['destination'] } };
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
                },
                schema: z.object({
                    snapshotId: z.string().describe('The ID of the snapshot to restore.')
                }),
                handler: async (args: any) => {
                    const rbResult = await this.sandbox.rollback(args['snapshotId']);
                    if (!rbResult.ok) throw rbResult.error;
                    return { ok: true, value: { status: 'rolled_back', snapshotId: args['snapshotId'] } };
                }
            },
            {
                name: 'generate_pog_manifest',
                description: 'Generate a pog.md manifest for a directory to explain its purpose and contents.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the directory.' }
                    },
                    required: ['path']
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the directory.')
                }),
                handler: async (args: any) => {
                    const absPath = join(this.config.projectRoot, args['path']);
                    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
                        throw new Error(`Directory not found: ${args['path']}`);
                    }
                    const dirFiles = fs.readdirSync(absPath);
                    const manifestContent = `# 📁 Pog Manifest: ${args['path']}\n\nThis folder contains specialized code for the POG-VIBE system.\n\n## 📄 File Inventory\n\n${dirFiles.map(f => `- **${f}**: [Pending AI Description]`).join('\n')}\n\n---\n\n*Generated by POG-VIBE Project Portability Engine.*`;
                    const manifestPath = join(absPath, 'pog.md');
                    fs.writeFileSync(manifestPath, manifestContent);
                    return { ok: true, value: { status: 'manifest_generated', path: relative(this.config.projectRoot, manifestPath) } };
                }
            }
        ]);
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
