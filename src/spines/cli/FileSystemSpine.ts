import { z } from 'zod';
import * as fs from 'fs';
import { join, relative } from 'path';
import type { VibeConfig, LimbTool } from '../../core/models.js';
import { Sandbox } from '../../sandbox/Sandbox.js';
import { readManyFiles } from '../../utils/ReadManyFiles.js';

/**
 * FileSystemSpine - Consolidated atomic file operations (CLI Bundle).
 */
export class FileSystemSpine {
    constructor(
        private readonly config: VibeConfig,
        private readonly sandbox: Sandbox
    ) { }

    private resolveSovereignPath(relPath: string): string {
        // 1. If absolute and starts with a root in stack, return as is (if exists)
        if (fs.existsSync(relPath)) {
            const isRooted = this.config.rootStack.some(root => relPath.startsWith(root));
            if (isRooted) return relPath;
        }

        // 2. Search through the root stack (God State -> Sovereign -> CWD)
        // We prioritize the stack order (typically: ProjectRoot, SovereignRoot, process.cwd())
        for (const root of this.config.rootStack) {
            const absPath = join(root, relPath);
            if (fs.existsSync(absPath)) {
                return absPath;
            }
        }

        // 3. Fallback to Project Root
        return join(this.config.projectRoot, relPath);
    }

    getTools(): LimbTool[] {
        return [
            {
                name: 'fs_read',
                description: 'Read the contents of a file from the federated root stack (D:\\ support).',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative or absolute path to the file.' }
                    },
                    required: ['path']
                },
                schema: z.object({
                    path: z.string().describe('Relative or absolute path to the file.')
                }),
                handler: async (args: Record<string, unknown>) => {
                    const filePath = args['path'] as string;
                    const absPath = this.resolveSovereignPath(filePath);

                    try {
                        if (!fs.existsSync(absPath)) {
                            // Emergency Cat Fallback if path exists but fs doesn't see it (permissions/locking)
                            const output = (import('child_process') as any).execSync(`cat "${absPath}"`, { encoding: 'utf8' });
                            return { ok: true, value: output };
                        }
                        return { ok: true, value: fs.readFileSync(absPath, 'utf8') };
                    } catch (error) {
                        try {
                            // Absolute OS Fallback
                            const output = (import('child_process') as any).execSync(`cat "${absPath}"`, { encoding: 'utf8' });
                            return { ok: true, value: output };
                        } catch (inner: any) {
                            throw new Error(`Unfailing Read FAILED for ${filePath}: ${(error as any).message} -> ${inner.message}`);
                        }
                    }
                }
            },
            {
                name: 'fs_read_many',
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
                handler: async (args: Record<string, unknown>) => {
                    const paths = (args['paths'] as string[]) || [];
                    const absPaths = paths.map((p: string) => this.resolveSovereignPath(p));
                    return await readManyFiles(absPaths);
                }
            },
            {
                name: 'fs_write',
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
                handler: async (args: Record<string, unknown>) => {
                    const filePath = args['path'] as string;
                    const content = args['content'] as string;
                    const absPath = this.resolveSovereignPath(filePath);
                    const snapshot = await this.sandbox.createSnapshot(`fs_write: ${filePath}`);

                    try {
                        fs.writeFileSync(absPath, content);
                        return { ok: true, value: { status: 'persisted', snapshotId: snapshot.ok ? snapshot.value : 'none' } };
                    } catch (error) {
                        try {
                            // Emergency Shell Write Fallback (Bypass Node locking/permissions)
                            const tmpFile = join(process.env['TEMP'] || '.', `pog_write_${Date.now()}.tmp`);
                            fs.writeFileSync(tmpFile, content);
                            (import('child_process') as any).execSync(`move /Y "${tmpFile}" "${absPath}"`);
                            return { ok: true, value: { status: 'force_persisted', snapshotId: snapshot.ok ? snapshot.value : 'none' } };
                        } catch (inner: any) {
                            throw new Error(`Unfailing Write FAILED for ${filePath}: ${(error as any).message} -> ${inner.message}`);
                        }
                    }
                }
            },
            {
                name: 'fs_list',
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
                handler: async (args: Record<string, unknown>) => {
                    const dirPath = (args['dir'] as string) || '';
                    const dir = this.resolveSovereignPath(dirPath);
                    const rootFound = this.config.rootStack.find(root => dir.startsWith(root)) || this.config.projectRoot;
                    const files = this.walk(dir).map(f => relative(rootFound, f));
                    return { ok: true, value: files };
                }
            },
            {
                name: 'fs_mkdir',
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
                handler: async (args: Record<string, unknown>) => {
                    const path = args['path'] as string;
                    const absPath = this.resolveSovereignPath(path);
                    if (fs.existsSync(absPath)) return { ok: true, value: { status: 'exists' } };
                    fs.mkdirSync(absPath, { recursive: true });
                    return { ok: true, value: { status: 'created', path: path } };
                }
            },
            {
                name: 'fs_delete',
                description: 'Safe removal of a file within the federated stack.',
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
                handler: async (args: Record<string, unknown>) => {
                    const filePath = args['path'] as string;
                    const absPath = this.resolveSovereignPath(filePath);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${filePath}`);
                    fs.unlinkSync(absPath);
                    return { ok: true, value: { status: 'deleted', path: filePath } };
                }
            },
            {
                name: 'fs_move',
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
                handler: async (args: Record<string, unknown>) => {
                    const source = args['source'] as string;
                    const destination = args['destination'] as string;
                    const srcAbs = this.resolveSovereignPath(source);
                    const dstAbs = this.resolveSovereignPath(destination);
                    if (!fs.existsSync(srcAbs)) throw new Error(`Source not found: ${source}`);
                    fs.renameSync(srcAbs, dstAbs);
                    return { ok: true, value: { status: 'moved', from: source, to: destination } };
                }
            },
            {
                name: 'fs_rollback',
                description: 'Rollback the project state to a previous snapshot.',
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
                handler: async (args: Record<string, unknown>) => {
                    const snapshotId = args['snapshotId'] as string;
                    const rbResult = await this.sandbox.rollback(snapshotId);
                    if (!rbResult.ok) throw (rbResult as any).error;
                    return { ok: true, value: { status: 'rolled_back', snapshotId: snapshotId } };
                }
            },
            {
                name: 'fs_generate_pog_manifest',
                description: 'Generate a pog.md manifest for a directory in the federated stack.',
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
                handler: async (args: Record<string, unknown>) => {
                    const dirPath = args['path'] as string;
                    const absPath = this.resolveSovereignPath(dirPath);
                    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isDirectory()) {
                        throw new Error(`Directory not found: ${dirPath}`);
                    }
                    const dirFiles = fs.readdirSync(absPath);
                    const manifestContent = `# 📁 Pog Manifest: ${dirPath}\n\nContents:\n\n${dirFiles.map(f => `- **${f}**`).join('\n')}`;
                    const manifestPath = join(absPath, 'pog.md');
                    fs.writeFileSync(manifestPath, manifestContent);
                    const rootFound = this.config.rootStack.find(root => manifestPath.startsWith(root)) || this.config.projectRoot;
                    return { ok: true, value: { status: 'manifest_generated', path: relative(rootFound, manifestPath) } };
                }
            }
        ];
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
