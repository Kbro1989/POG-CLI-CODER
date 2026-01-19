/**
 * CodebaseIndexer - Auto-indexes project files into VectorDB
 * Respects .gitignore and filters out binary/generated files
 */

import { VectorDB } from './VectorDB.js';
import { GeminiService } from '../core/GeminiService.js';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import ignore from 'ignore';
import pino from 'pino';

const logger = pino({
    name: 'CodebaseIndexer',
    base: { hostname: 'POG-VIBE' }
});

export class CodebaseIndexer {
    private vectorDB: VectorDB;
    private gemini: GeminiService | undefined;
    private ignoreFilter: ReturnType<typeof ignore>;
    private projectRoot: string;

    constructor(vectorDB: VectorDB, gemini: GeminiService | undefined, projectRoot: string) {
        this.vectorDB = vectorDB;
        this.gemini = gemini;
        this.projectRoot = projectRoot;
        this.ignoreFilter = this.loadGitignore(projectRoot);
    }

    private loadGitignore(root: string): ReturnType<typeof ignore> {
        const ig = ignore();

        // Try to load .gitignore
        try {
            const gitignorePath = join(root, '.gitignore');
            if (existsSync(gitignorePath)) {
                const content = readFileSync(gitignorePath, 'utf8');
                ig.add(content);
            }
        } catch (error) {
            logger.debug({ error }, 'No .gitignore found, using defaults');
        }

        // Always ignore these
        ig.add([
            'node_modules/**',
            '.git/**',
            'dist/**',
            'build/**',
            'coverage/**',
            '.gemini/**',
            '*.lock',
            'package-lock.json',
            '.env',
            '*.log'
        ]);

        return ig;
    }

    /**
     * Index entire project into VectorDB
     */
    async indexProject(): Promise<{ indexed: number; skipped: number }> {
        logger.info({ root: this.projectRoot }, 'Starting codebase indexing');
        const startTime = Date.now();

        let indexed = 0;
        let skipped = 0;

        const processDir = async (dir: string) => {
            try {
                const files = readdirSync(dir);

                for (const file of files) {
                    const fullPath = join(dir, file);
                    const relPath = relative(this.projectRoot, fullPath);

                    if (this.ignoreFilter.ignores(relPath)) continue;

                    try {
                        const stat = statSync(fullPath);

                        if (stat.isDirectory()) {
                            await processDir(fullPath);
                        } else {
                            if (!this.isCodeFile(file)) continue;

                            try {
                                const content = readFileSync(fullPath, 'utf8');
                                if (content.length > 500000) {
                                    skipped++;
                                    continue;
                                }

                                // Generate real embedding if service is available
                                let embedding = new Float32Array(0);
                                const gemini = this.gemini;
                                if (gemini && typeof gemini.embed === 'function') {
                                    const embedResult = await gemini.embed(content);
                                    if (embedResult.ok) {
                                        embedding = new Float32Array(embedResult.value);
                                    }
                                }

                                await this.vectorDB.addLesson({
                                    id: relPath,
                                    text: content,
                                    embedding,
                                    sessionId: 'indexer',
                                    projectId: this.projectRoot.split(/[\\/]/).pop() || 'global',
                                    errorType: '',
                                    createdAt: Date.now(),
                                    metadata: {
                                        path: relPath,
                                        type: this.getFileType(fullPath),
                                        lines: content.split('\n').length
                                    }
                                });
                                indexed++;
                            } catch (e) {
                                logger.warn({ file: relPath }, 'Failed to index');
                                skipped++;
                            }
                        }
                    } catch (statError) {
                        // ignore stat errors
                    }
                }
            } catch (dirError) {
                // ignore dir errors
            }
        };

        await processDir(this.projectRoot);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info({ indexed, skipped, elapsed }, 'Indexing complete');

        return { indexed, skipped };
    }

    /**
     * Check if file is a code file worth indexing
     */
    private isCodeFile(filename: string): boolean {
        const codeExts = [
            '.ts', '.tsx', '.js', '.jsx',
            '.py', '.java', '.go', '.rs',
            '.c', '.cpp', '.h', '.hpp',
            '.rb', '.php', '.swift', '.kt',
            '.cs', '.scala', '.clj', '.ex',
            '.md', '.json', '.yaml', '.yml',
            '.sql', '.sh', '.bash'
        ];

        return codeExts.some(ext => filename.endsWith(ext));
    }

    /**
     * Determine file type from extension
     */
    private getFileType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase();

        const typeMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript-react',
            'js': 'javascript',
            'jsx': 'javascript-react',
            'py': 'python',
            'java': 'java',
            'go': 'go',
            'rs': 'rust',
            'md': 'markdown',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml'
        };

        return ext ? (typeMap[ext] || ext) : 'unknown';
    }

    /**
     * Index a single file (for incremental updates)
     */
    async indexFile(filePath: string): Promise<void> {
        const relativePath = relative(this.projectRoot, filePath);

        if (this.ignoreFilter.ignores(relativePath)) {
            logger.debug({ file: relativePath }, 'File ignored');
            return;
        }

        try {
            const content = readFileSync(filePath, 'utf8');

            // Generate real embedding if service is available
            let embedding = new Float32Array(0);
            const gemini = this.gemini;
            if (gemini && typeof gemini.embed === 'function') {
                const embedResult = await gemini.embed(content);
                if (embedResult.ok) {
                    embedding = new Float32Array(embedResult.value);
                }
            }

            await this.vectorDB.addLesson({
                id: relativePath,
                text: content,
                embedding,
                sessionId: 'indexer',
                projectId: this.projectRoot.split(/[\\/]/).pop() || 'global',
                errorType: '',
                createdAt: Date.now(),
                metadata: {
                    path: relativePath,
                    type: this.getFileType(filePath),
                    lines: content.split('\n').length
                }
            });

            logger.debug({ file: relativePath }, 'File indexed');
        } catch (error) {
            logger.error({ file: filePath, error }, 'Failed to index file');
        }
    }
}
