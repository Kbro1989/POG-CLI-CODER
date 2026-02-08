import { BaseLimb } from './BaseLimb.js';
import { VibeConfig } from '../../core/models.js';
import { Sandbox } from '../../sandbox/Sandbox.js';
import * as fs from 'fs';
import { join, relative } from 'path';

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
                handler: async (args) => {
                    const absPath = join(this.config.projectRoot, args.path);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args.path}`);
                    return { ok: true, value: fs.readFileSync(absPath, 'utf8') };
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
                handler: async (args) => {
                    const absPath = join(this.config.projectRoot, args.path);
                    const snapshot = await this.sandbox.createSnapshot(`write_file: ${args.path}`);
                    fs.writeFileSync(absPath, args.content);
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
                handler: async (args) => {
                    const absPath = join(this.config.projectRoot, args.path);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args.path}`);
                    const content = fs.readFileSync(absPath, 'utf8');
                    if (!content.includes(args.search)) throw new Error('Search string not found in file - aborting patch.');

                    await this.sandbox.createSnapshot(`patch_file: ${args.path}`);
                    const newContent = content.replace(args.search, args.replace);
                    fs.writeFileSync(absPath, newContent);
                    return { ok: true, value: { status: 'patched' } };
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
                handler: async (args) => {
                    const dir = join(this.config.projectRoot, args.dir || '');
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
                handler: async (args) => {
                    const absPath = join(this.config.projectRoot, args.path);
                    if (fs.existsSync(absPath)) return { ok: true, value: { status: 'exists' } };
                    fs.mkdirSync(absPath, { recursive: true });
                    return { ok: true, value: { status: 'created', path: args.path } };
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
                handler: async (args) => {
                    const absPath = join(this.config.projectRoot, args.path);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${args.path}`);
                    fs.unlinkSync(absPath);
                    return { ok: true, value: { status: 'deleted', path: args.path } };
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
                handler: async (args) => {
                    const srcAbs = join(this.config.projectRoot, args.source);
                    const dstAbs = join(this.config.projectRoot, args.destination);
                    if (!fs.existsSync(srcAbs)) throw new Error(`Source not found: ${args.source}`);
                    fs.renameSync(srcAbs, dstAbs);
                    return { ok: true, value: { status: 'moved', from: args.source, to: args.destination } };
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
                handler: async (args) => {
                    const rbResult = await this.sandbox.rollback(args.snapshotId);
                    if (!rbResult.ok) throw rbResult.error;
                    return { ok: true, value: { status: 'rolled_back', snapshotId: args.snapshotId } };
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
                handler: async (args) => {
                    const absPath = join(this.config.projectRoot, args.path);
                    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
                        throw new Error(`Directory not found: ${args.path}`);
                    }
                    const dirFiles = fs.readdirSync(absPath);
                    const manifestContent = `# 📁 Pog Manifest: ${args.path}\n\nThis folder contains specialized code for the POG-VIBE system.\n\n## 📄 File Inventory\n\n${dirFiles.map(f => `- **${f}**: [Pending AI Description]`).join('\n')}\n\n---\n\n*Generated by POG-VIBE Project Portability Engine.*`;
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
