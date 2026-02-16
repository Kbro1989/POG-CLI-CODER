/**
 * Project Snapshot Generator
 * 
 * Adapted from user's Python snapshot script.
 * Creates a combined view of the project for small models
 * to gain context awareness during monitoring.
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative, basename } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';

const execAsync = promisify(exec);
const logger = pino({
    name: 'ProjectSnapshot',
    base: { hostname: 'POG-VIBE' }
});

export interface SnapshotOptions {
    readonly projectRoot: string;
    readonly includeFolders: readonly string[];
    readonly outputFile?: string;
    readonly maxFileSize?: number; // Skip files larger than this (bytes)
}

export class ProjectSnapshot {
    private readonly nodeModulesExclude = 'node_modules';

    constructor(private readonly options: SnapshotOptions) { }

    /**
     * Generate a combined project snapshot
     * Returns the snapshot content as a string
     */
    generate(): string {
        const lines: string[] = [];
        const { projectRoot, includeFolders } = this.options;
        const maxFileSize = this.options.maxFileSize || 100000; // 100KB default

        lines.push('### COMBINED PROJECT SNAPSHOT ###');
        lines.push('');
        lines.push(`Generated at: ${new Date().toISOString()}`);
        lines.push(`Project Root: ${projectRoot}`);
        lines.push('');

        let fileCount = 0;
        let totalBytes = 0;

        for (const folder of includeFolders) {
            const fullPath = join(projectRoot, folder);

            try {
                if (statSync(fullPath).isDirectory()) {
                    const folderFiles = this.walkDirectory(fullPath, projectRoot, maxFileSize);

                    for (const { relPath, content } of folderFiles) {
                        lines.push(`===== BEGIN ${relPath} =====`);
                        lines.push(content);
                        lines.push(`===== END ${relPath} =====`);
                        lines.push('');
                        fileCount++;
                        totalBytes += content.length;
                    }
                }
            } catch (error) {
                logger.warn({ folder, error }, 'Failed to process folder');
            }
        }

        lines.push('');
        lines.push(`### SNAPSHOT SUMMARY ###`);
        lines.push(`Files included: ${fileCount}`);
        lines.push(`Total size: ${(totalBytes / 1024).toFixed(2)} KB`);

        const snapshot = lines.join('\n');

        // Optionally write to file
        if (this.options.outputFile) {
            writeFileSync(this.options.outputFile, snapshot, 'utf-8');
            logger.info({ outputFile: this.options.outputFile, fileCount }, 'Snapshot written to file');
        }

        return snapshot;
    }

    /**
     * Generate a lightweight snapshot for monitoring (key files only)
     */
    generateLightweight(): string {
        const lines: string[] = [];
        const { projectRoot } = this.options;

        lines.push('### LIGHTWEIGHT PROJECT SNAPSHOT ###');
        lines.push('');

        // Only include critical config and entry files
        const criticalFiles = [
            'package.json',
            'tsconfig.json',
            'src/core/models.ts',
            'src/core/Router.ts',
            'src/core/Orchestrator.ts'
        ];

        for (const filePath of criticalFiles) {
            const fullPath = join(projectRoot, filePath);

            try {
                const content = this.readFileSafely(fullPath);
                lines.push(`===== ${filePath} =====`);
                lines.push(content);
                lines.push('');
            } catch {
                // Skip missing files
            }
        }

        return lines.join('\n');
    }

    private walkDirectory(
        dirPath: string,
        rootPath: string,
        maxFileSize: number
    ): Array<{ relPath: string; content: string }> {
        const result: Array<{ relPath: string; content: string }> = [];

        try {
            const entries = readdirSync(dirPath);

            for (const entry of entries.sort()) {
                const fullPath = join(dirPath, entry);
                const stat = statSync(fullPath);

                if (stat.isDirectory()) {
                    // Skip node_modules
                    if (entry === this.nodeModulesExclude) continue;

                    // Recurse
                    result.push(...this.walkDirectory(fullPath, rootPath, maxFileSize));
                } else if (stat.isFile()) {
                    // Skip large files
                    if (stat.size > maxFileSize) {
                        logger.debug({ file: entry, size: stat.size }, 'Skipping large file');
                        continue;
                    }

                    const relPath = relative(rootPath, fullPath);
                    const content = this.readFileSafely(fullPath);

                    if (content) {
                        result.push({ relPath, content });
                    }
                }
            }
        } catch (error) {
            logger.warn({ dirPath, error }, 'Failed to read directory');
        }

        return result;
    }

    private readFileSafely(filePath: string): string {
        const encodings: BufferEncoding[] = ['utf-8', 'utf-16le', 'latin1'];

        for (const encoding of encodings) {
            try {
                return readFileSync(filePath, encoding);
            } catch {
                continue;
            }
        }

        return `[ERROR] Could not decode file: ${basename(filePath)}`;
    }

    /**
     * Create Git Snapshot — Biological Pulse Checkpoint
     * 
     * Uses real git commands to create a restorable snapshot
     * for rollback tracking. Falls back to file-based snapshot
     * if git is unavailable.
     * 
     * Mapped to Hexagram Line 2 (Biological Pulse / System Vitality):
     *  - Git snapshot taken: YoungYang (⚊ Stable vitality)
     *  - Git unavailable:    YoungYin  (⚋ Receptive — file fallback)
     */
    async createGitSnapshot(reason: string): Promise<{ hash: string | null; method: 'git' | 'file' }> {
        const { projectRoot } = this.options;
        const isGit = existsSync(join(projectRoot, '.git'));

        if (!isGit) {
            logger.info('No .git directory — using file-based snapshot');
            return { hash: null, method: 'file' };
        }

        try {
            // Stage all changes
            await execAsync('git add -A', { cwd: projectRoot });

            // Create named stash for rollback
            const sanitizedReason = reason.replace(/"/g, '\\"').substring(0, 100);
            await execAsync(`git stash push -m "pog-snapshot: ${sanitizedReason}"`, {
                cwd: projectRoot
            });

            // Capture current HEAD for tracking
            const { stdout } = await execAsync('git rev-parse HEAD', { cwd: projectRoot });
            const hash = stdout.trim();

            logger.info({ hash, reason: sanitizedReason }, 'Git snapshot created (Biological Pulse checkpoint)');
            return { hash, method: 'git' };
        } catch (error: unknown) {
            const err = error as { message?: string };
            logger.warn({ error: err.message }, 'Git snapshot failed, falling back to file-based');
            return { hash: null, method: 'file' };
        }
    }
}
