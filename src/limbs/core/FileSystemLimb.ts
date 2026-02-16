import { BaseLimb } from './BaseLimb.js';
import type { VibeConfig } from '../../core/models.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync, renameSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { YaoState } from '../../core/models.js';
import type { LimbTool } from '../../core/ToolingSpine.js';

/**
 * FileSystemLimb - Core File Operations
 *
 * Provides fundamental file system capabilities: read, write, list, delete, rename.
 * This is the raw file I/O layer — distinct from FileLimb which handles
 * Git/NPM/Scaffolding workflows.
 *
 * Sovereign Analogy: The fingers of the organism — precise, low-level manipulation.
 */
export class FileSystemLimb extends BaseLimb {
    readonly id = 'filesystem_limb';
    readonly type = 'maintenance' as const;

    constructor(config: VibeConfig) {
        super(config);

        const tools: LimbTool[] = [
            {
                name: 'read_file',
                description: 'Read the contents of a file at the given path.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Absolute path to the file to read.' }
                    },
                    required: ['path']
                },
                handler: async (args: Record<string, unknown>) => {
                    const filePath = String(args['path'] || '');
                    if (!existsSync(filePath)) {
                        return { ok: false as const, error: new Error(`File not found: ${filePath}`) };
                    }
                    const content = readFileSync(filePath, 'utf-8');
                    await this.pinPulse(YaoState.YoungYang, `Read file: ${basename(filePath)} (${content.length} chars)`);
                    return { ok: true as const, value: { output: content, data: { path: filePath, size: content.length } } };
                }
            },
            {
                name: 'write_file',
                description: 'Write content to a file, creating directories as needed.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Absolute path to write to.' },
                        content: { type: 'string', description: 'Content to write.' }
                    },
                    required: ['path', 'content']
                },
                handler: async (args: Record<string, unknown>) => {
                    const filePath = String(args['path'] || '');
                    const content = String(args['content'] || '');
                    const dir = dirname(filePath);
                    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
                    writeFileSync(filePath, content, 'utf-8');
                    await this.pinPulse(YaoState.YoungYang, `Wrote file: ${basename(filePath)} (${content.length} chars)`);
                    return { ok: true as const, value: { output: `Written: ${filePath}`, data: { path: filePath, bytesWritten: content.length } } };
                }
            },
            {
                name: 'list_directory',
                description: 'List the contents of a directory with file metadata.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Absolute path to the directory.' },
                        recursive: { type: 'boolean', description: 'Whether to list recursively.' }
                    },
                    required: ['path']
                },
                handler: async (args: Record<string, unknown>) => {
                    const dirPath = String(args['path'] || '');
                    if (!existsSync(dirPath)) {
                        return { ok: false as const, error: new Error(`Directory not found: ${dirPath}`) };
                    }
                    const entries = readdirSync(dirPath).map(name => {
                        const full = join(dirPath, name);
                        const stat = statSync(full);
                        return {
                            name,
                            type: stat.isDirectory() ? 'directory' : 'file',
                            size: stat.size,
                            ext: stat.isFile() ? extname(name) : undefined,
                            modified: stat.mtime.toISOString()
                        };
                    });
                    await this.pinPulse(YaoState.YoungYang, `Listed directory: ${basename(dirPath)} (${entries.length} entries)`);
                    return { ok: true as const, value: { output: JSON.stringify(entries, null, 2), data: { path: dirPath, count: entries.length } } };
                }
            },
            {
                name: 'delete_file',
                description: 'Delete a file at the given path.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Absolute path to delete.' }
                    },
                    required: ['path']
                },
                handler: async (args: Record<string, unknown>) => {
                    const filePath = String(args['path'] || '');
                    if (!existsSync(filePath)) {
                        return { ok: false as const, error: new Error(`File not found: ${filePath}`) };
                    }
                    unlinkSync(filePath);
                    await this.pinPulse(YaoState.OldYin, `Deleted file: ${basename(filePath)}`);
                    return { ok: true as const, value: { output: `Deleted: ${filePath}`, data: { path: filePath } } };
                }
            },
            {
                name: 'rename_file',
                description: 'Rename or move a file.',
                parameters: {
                    type: 'object',
                    properties: {
                        from: { type: 'string', description: 'Current absolute path.' },
                        to: { type: 'string', description: 'New absolute path.' }
                    },
                    required: ['from', 'to']
                },
                handler: async (args: Record<string, unknown>) => {
                    const from = String(args['from'] || '');
                    const to = String(args['to'] || '');
                    if (!existsSync(from)) {
                        return { ok: false as const, error: new Error(`Source not found: ${from}`) };
                    }
                    const toDir = dirname(to);
                    if (!existsSync(toDir)) mkdirSync(toDir, { recursive: true });
                    renameSync(from, to);
                    await this.pinPulse(YaoState.YoungYang, `Renamed: ${basename(from)} → ${basename(to)}`);
                    return { ok: true as const, value: { output: `Renamed: ${from} → ${to}`, data: { from, to } } };
                }
            }
        ];

        this.registerTools(tools);
        this.logger.info('FileSystemLimb initialized — 5 core file operations registered.');
    }
}
