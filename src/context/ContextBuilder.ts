/**
 * ContextBuilder - Build multi-file context for AI models
 * Identifies related files via imports and semantic similarity
 */

import { VectorDB } from '../learning/VectorDB.js';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
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

import { ModelExecutor } from '../core/ModelExecutor.js';

export class ContextBuilder {
    private readonly pinnedFiles: Set<string> = new Set();

    constructor(
        private readonly vectorDB: VectorDB,
        private projectRoot: string,
        private readonly projectId: string,
        private readonly modelExecutor: ModelExecutor,
        private readonly rootStack: string[] = [],
        private readonly aiContextPath?: string
    ) {
        logger.debug({ vectorDB: !!this.vectorDB, executor: !!this.modelExecutor, roots: this.rootStack.length }, 'ContextBuilder initialized');
    }

    /**
     * Pin a file to the active context (forced inclusion)
     */
    pinFile(filePath: string): void {
        const absPath = resolve(this.projectRoot, filePath);
        this.pinnedFiles.add(absPath);
        logger.info({ path: absPath }, 'File pinned to active context');
    }

    /**
     * Unpin a file
     */
    unpinFile(filePath: string): void {
        const absPath = resolve(this.projectRoot, filePath);
        this.pinnedFiles.delete(absPath);
        logger.info({ path: absPath }, 'File unpinned');
    }

    /**
     * Get all pinned files
     */
    getPinnedFiles(): string[] {
        return Array.from(this.pinnedFiles).map(p => relative(this.projectRoot, p));
    }

    /**
     * Set the project root (for workspace switching)
     */
    setProjectRoot(newRoot: string): void {
        this.projectRoot = newRoot;
        this.pinnedFiles.clear(); // Clear pins when switching project to prevent cross-leakage
        logger.info({ newRoot }, 'ContextBuilder root updated');
    }

    async queryLessons(prompt: string): Promise<any[]> {
        if (!this.modelExecutor) return [];

        try {
            const embeddingResult = await this.modelExecutor.embed(prompt);
            if (embeddingResult.ok) {
                const similar = await this.vectorDB.searchSimilar(embeddingResult.value, 15, 'lessons');
                if (similar.ok) {
                    return similar.value.map(l => l.metadata);
                }
            }
        } catch (err) {
            logger.warn({ err }, 'Failed to query lessons from VectorDB');
        }
        return [];
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
            .slice(0, 15);

        // 3. Find semantically related files via VectorDB
        const related: string[] = [];

        // 4. Proactive Federated Metadata Discovery (God State Awareness)
        const manifests = this.findDominantMetadata(filePath);
        manifests.forEach(m => {
            logger.info({ manifest: m }, 'Sovereign Law detected and injected into federated context');
            related.push(m);
        });

        const geminiMd = join(this.projectRoot, '.gemini.md');
        if (this.modelExecutor) {
            try {
                const query = content.substring(0, 1000);
                const embeddingResult = await this.modelExecutor.embed(query);
                if (embeddingResult.ok) {
                    const similar = await this.vectorDB.searchSimilar(embeddingResult.value, 10, this.projectId);
                    if (similar.ok) {
                        const similarPaths = similar.value
                            .map(l => (l.metadata as any)?.path)
                            .filter((p): p is string => !!p && p !== relativePath && p !== relative(this.projectRoot, geminiMd || ''));
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
     * Find GEMINI.md or similar dominant metadata across the federated rootStack
     */
    private findDominantMetadata(startPath: string): string[] {
        const manifests: string[] = [];
        const seen = new Set<string>();

        // 1. Check upward from the startPath to the projectRoot
        let currentDir = statSync(startPath).isDirectory() ? startPath : dirname(startPath);
        while (currentDir.length >= this.projectRoot.length) {
            const target = join(currentDir, 'GEMINI.md');
            if (existsSync(target) && !seen.has(target)) {
                manifests.push(target);
                seen.add(target);
            }
            const parent = dirname(currentDir);
            if (parent === currentDir) break;
            currentDir = parent;
        }

        // 2. Check each root in the stack for their respective GEMINI.md
        for (const root of this.rootStack) {
            const target = join(root, 'GEMINI.md');
            if (existsSync(target) && !seen.has(target)) {
                manifests.push(target);
                seen.add(target);
            }
        }

        // 3. Inject AI context if it exists and hasn't been added
        if (this.aiContextPath && existsSync(this.aiContextPath)) {
            // Check for a manifest inside ai-context
            const target = join(this.aiContextPath, 'SOVEREIGN_CONTEXT.md');
            if (existsSync(target) && !seen.has(target)) {
                manifests.push(target);
                seen.add(target);
            }
        }

        return manifests;
    }

    /**
     * SENSE HELPER: Ghost of Architecture
     * Queries the manifest for structural laws relevant to the current domain.
     */
    getArchitectureAlignment(prompt: string, manifest: any): string[] {
        const alignments: string[] = [];
        const domainModel = manifest.domainModel || {};

        for (const [domain, config] of Object.entries(domainModel)) {
            const typedConfig = config as { file: string; properties: string[] };
            if (prompt.toLowerCase().includes(domain.toLowerCase())) {
                alignments.push(`Domain Alignment: ${domain} (Target: ${typedConfig.file})`);
                typedConfig.properties.forEach(p => alignments.push(`Constraint: Must utilize ${p}`));
            }
        }
        return alignments;
    }

    /**
     * SENSE HELPER: Semantic Proximity Scout
     * Queries VectorDB for "Golden Templates" representing Peak Implementation.
     */
    async getGoldenTemplates(prompt: string): Promise<string[]> {
        if (!this.modelExecutor) return [];

        try {
            const embeddingResult = await this.modelExecutor.embed(`BEST PRACTICE IMPLEMENTATION FOR: ${prompt}`);
            if (embeddingResult.ok) {
                const similar = await this.vectorDB.searchSimilar(embeddingResult.value, 3, this.projectId);
                if (similar.ok) {
                    return similar.value.map(l => {
                        const meta = l.metadata as any;
                        const score = (l as any).score ? (l as any).score.toFixed(2) : '1.00';
                        return `Template match: ${meta.path || 'unknown'} (Score: ${score})`;
                    });
                }
            }
        } catch (err) {
            logger.warn({ err }, 'Golden Template search failed');
        }
        return [];
    }

    /**
     * Retrieve global context from docs/ai-context based on relevance
     */
    async getGlobalContext(query: string): Promise<string[]> {
        if (!this.modelExecutor) return [];

        try {
            const embeddingResult = await this.modelExecutor.embed(query);
            if (embeddingResult.ok) {
                const similar = await this.vectorDB.searchSimilar(embeddingResult.value, 5, 'global');
                if (similar.ok) {
                    return similar.value
                        .filter(l => {
                            const p = (l.metadata as any)?.path || '';
                            return p.includes('docs/ai-context') || p.includes('docs\\ai-context');
                        })
                        .map(l => (l.metadata as any).path);
                }
            }
        } catch (err) {
            logger.warn({ err }, 'Global context retrieval failed');
        }
        return [];
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
            const fullPath = resolve(dir, importPath);

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
            context.related.forEach(file => {
                // If it's a cross-project match, we might want to label it differently
                // Note: FileContext currently only has paths, not projectIds. 
                // We'd need to update FileContext to include this data if we want precise per-file labels here.
                appendFile(file, 'SEMANTIC MATCH');
            });
        }

        return parts.join('\n');
    }
}
