/**
 * ContextBuilder - Build multi-file context for AI models
 * Identifies related files via imports and semantic similarity
 */

import { VectorDB } from '../learning/VectorDB.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import pino from 'pino';

const logger = pino({
    name: 'ContextBuilder',
    base: { hostname: 'POG-VIBE' }
});

export interface FileContext {
    primary: string;
    related: string[];
    imports: string[];
    sameDirectory: string[];
}

import { GeminiService } from '../core/GeminiService.js';

export class ContextBuilder {
    constructor(
        private vectorDB: VectorDB,
        private projectRoot: string,
        private gemini?: GeminiService
    ) {
        logger.debug({ vectorDB: !!this.vectorDB, gemini: !!this.gemini }, 'ContextBuilder initialized');
    }

    /**
     * Build comprehensive context for a file
     */
    async buildContext(filePath: string): Promise<FileContext> {
        const content = readFileSync(filePath, 'utf8');
        const relativePath = relative(this.projectRoot, filePath);

        // 1. Extract import statements
        const imports = this.extractImports(content, filePath);

        // 2. Find files in same directory
        const sameDir = this.getFilesInDirectory(dirname(filePath))
            .filter(f => f !== filePath)
            .slice(0, 15); // Expanded to 15 files

        // 3. Find semantically related files via VectorDB
        // Note: This requires embeddings to work properly
        // 3. Find semantically related files via VectorDB
        const related: string[] = [];

        if (this.gemini) {
            try {
                // Use the file content itself as the query if prompt/query is not available 
                // Wait, logic flaw: buildContext is called with filePath, not a prompt.
                // We want to find *text* related to the file? Or is this method supposed to be `retrieveContext(prompt)`?
                // The method is `buildContext(filePath: string)`.
                // So the query should be the file content or summary?
                // Actually embedding the whole file content might be heavy for search.
                // Let's use the filename or first 1000 chars as query for now.
                const query = content.substring(0, 1000); // Use start of file as proxy

                const embeddingResult = await this.gemini.embed(query);
                if (embeddingResult.ok) {
                    const similar = await this.vectorDB.searchSimilar(embeddingResult.value, 25); // Expanded to 25 results
                    if (similar.ok) {
                        const similarPaths = similar.value
                            .map(l => {
                                const meta = l.metadata as Record<string, unknown> | undefined;
                                return meta?.['path'];
                            })
                            .filter((p): p is string => typeof p === 'string');
                        related.push(...similarPaths);
                    }
                }
            } catch (err) {
                logger.warn({ err }, 'Semantic search failed');
            }
        }

        return {
            primary: relativePath,
            related,
            imports,
            sameDirectory: sameDir.map(f => relative(this.projectRoot, f))
        };
    }

    /**
     * Build comprehensive context for a file including recursive imports
     */
    async buildDeepContext(filePath: string, depth = 2): Promise<FileContext> {
        const context = await this.buildContext(filePath);
        const visited = new Set<string>([filePath]);
        const deepImports = new Set<string>(context.imports);

        if (depth > 1) {
            for (const imp of context.imports) {
                if (visited.has(imp)) continue;
                visited.add(imp);
                try {
                    const content = readFileSync(imp, 'utf8');
                    const subImports = this.extractImports(content, imp);
                    subImports.forEach(si => deepImports.add(si));
                } catch { /* skip */ }
            }
        }

        return {
            ...context,
            imports: Array.from(deepImports)
        };
    }

    /**
     * Get a visual map of the project structure
     */
    getProjectMap(maxDepth = 3): string {
        const root = this.projectRoot;
        let map = 'Project Structure:\n';

        const walk = (dir: string, currentDepth: number) => {
            if (currentDepth > maxDepth) return;
            const entries = readdirSync(dir);
            for (const entry of entries) {
                if (entry === 'node_modules' || entry === '.git' || entry === 'dist') continue;
                const fullPath = join(dir, entry);
                const rel = relative(root, fullPath);
                const indent = '  '.repeat(currentDepth);
                try {
                    const stat = statSync(fullPath);
                    if (stat.isDirectory()) {
                        map += `${indent}📁 ${rel}/\n`;
                        walk(fullPath, currentDepth + 1);
                    } else if (this.isCodeFile(entry)) {
                        map += `${indent}📄 ${rel}\n`;
                    }
                } catch { /* skip */ }
            }
        };

        walk(root, 0);
        return map;
    }
    private extractImports(content: string, filePath: string): string[] {
        const imports: string[] = [];

        // ES6 imports: import foo from 'bar'
        const importRegex = /from\s+['"](.+?)['"]/g;
        const importMatches = [...content.matchAll(importRegex)];

        // CommonJS: require('foo')
        const requireRegex = /require\s*\(\s*['"](.+?)['"]\s*\)/g;
        const requireMatches = [...content.matchAll(requireRegex)];

        const allImports = [
            ...importMatches.map(m => m[1]),
            ...requireMatches.map(m => m[1])
        ];

        // Resolve local imports (starting with . or ..)
        for (const imp of allImports) {
            if (imp && imp.startsWith('.')) {
                const resolved = this.resolveImportPath(imp, filePath);
                if (resolved) {
                    imports.push(resolved);
                }
            }
        }

        return imports;
    }

    /**
     * Resolve relative import to absolute path
     */
    private resolveImportPath(importPath: string, fromFile: string): string | null {
        try {
            const dir = dirname(fromFile);
            let fullPath = resolve(dir, importPath);

            // Try common extensions
            const extensions = ['.ts', '.tsx', '.js', '.jsx'];

            // If no extension, try adding them
            if (!extensions.some(ext => fullPath.endsWith(ext))) {
                for (const ext of extensions) {
                    const tryPath = fullPath + ext;
                    try {
                        statSync(tryPath);
                        return tryPath;
                    } catch {
                        // Try next extension
                    }
                }

                // Try index files
                for (const ext of extensions) {
                    const tryPath = join(fullPath, 'index' + ext);
                    try {
                        statSync(tryPath);
                        return tryPath;
                    } catch {
                        // Try next
                    }
                }
            } else {
                // Has extension, check if exists
                try {
                    statSync(fullPath);
                    return fullPath;
                } catch {
                    return null;
                }
            }

            return null;
        } catch (error) {
            logger.debug({ importPath, fromFile, error }, 'Failed to resolve import');
            return null;
        }
    }

    /**
     * Get all code files in a directory
     */
    private getFilesInDirectory(dirPath: string): string[] {
        try {
            const entries = readdirSync(dirPath);
            const files: string[] = [];

            for (const entry of entries) {
                const fullPath = join(dirPath, entry);
                try {
                    const stat = statSync(fullPath);
                    if (stat.isFile() && this.isCodeFile(entry)) {
                        files.push(fullPath);
                    }
                } catch {
                    // Skip files we can't stat
                }
            }

            return files;
        } catch (error) {
            logger.debug({ dirPath, error }, 'Failed to read directory');
            return [];
        }
    }

    /**
     * Check if filename is a code file
     */
    private isCodeFile(filename: string): boolean {
        const codeExts = ['.ts', '.tsx', '.js', '.jsx', '.json'];
        return codeExts.some(ext => filename.endsWith(ext));
    }

    /**
     * Format context for model prompt with FULL CONTENT
     */
    formatContextForPrompt(context: FileContext): string {
        const parts: string[] = [];
        const root = this.projectRoot;
        const injected = new Set<string>();

        const appendFile = (path: string, label: string) => {
            const absPath = path.startsWith(root) ? path : resolve(root, path);
            if (injected.has(absPath)) return;
            try {
                const content = readFileSync(absPath, 'utf8');
                const relativePath = relative(root, absPath);
                parts.push(`--- FILE: ${relativePath} (${label}) ---`);
                parts.push('```typescript');
                parts.push(content);
                parts.push('```\n');
                injected.add(absPath);
            } catch {
                // Skip if can't read
            }
        };

        parts.push(`Primary file: ${context.primary}`);
        appendFile(resolve(root, context.primary), 'PRIMARY SOURCE');

        if (context.imports && context.imports.length > 0) {
            parts.push(`\nImported dependencies:`);
            context.imports.forEach(imp => appendFile(imp, 'DEPENDENCY'));
        }

        if (context.sameDirectory && context.sameDirectory.length > 0) {
            parts.push(`\nRelated files in same directory:`);
            context.sameDirectory.forEach(file => appendFile(file, 'SAME DIRECTORY'));
        }

        if (context.related && context.related.length > 0) {
            parts.push(`\nSemantically related context:`);
            context.related.forEach(file => appendFile(file, 'SEMANTIC MATCH'));
        }

        return parts.join('\n');
    }
}
