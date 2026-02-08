import { BaseLimb } from './BaseLimb.js';
import { z } from 'zod';
import { VibeConfig, Result } from '../../core/models.js';
import { VectorDB } from '../../learning/VectorDB.js';
import { CodebaseIndexer } from '../../learning/CodebaseIndexer.js';
import { GeminiService } from '../../core/GeminiService.js';

/**
 * MemoryLimb - Standardized interface for POG Learning & Recall.
 * 
 * Exposes the VectorDB and CodebaseIndexer to agents via the Tooling Spine.
 * Adheres to Sovereign Lock: No mocks, no placeholders.
 */
export class MemoryLimb extends BaseLimb {
    readonly id = 'memory_recall';
    readonly type = 'memory';

    constructor(
        config: VibeConfig,
        private readonly vectorDB: VectorDB,
        private readonly indexer: CodebaseIndexer,
        private readonly gemini: GeminiService
    ) {
        super(config);
        this.registerMemoryTools();
    }

    private registerMemoryTools(): void {
        this.registerTools([
            {
                name: 'search_similar_lessons',
                description: 'Search the neural memory for relevant past lessons, errors, or implementation patterns.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The search query or context to match.' },
                        limit: { type: 'number', description: 'Maximum number of results (default: 5).' }
                    },
                    required: ['query']
                },
                schema: z.object({
                    query: z.string(),
                    limit: z.number().optional()
                }),
                handler: async (args: { query: string; limit?: number }): Promise<Result<{ status: string; results: any[] }>> => {
                    this.logger.info({ query: args.query }, 'Searching memory via cognitive embedding');

                    // Reality Lock: 1. Generate real embedding via Gemini
                    const embedResult = await this.gemini.embed(args.query);
                    if (!embedResult.ok) {
                        return { ok: false, error: embedResult.error };
                    }

                    // 2. Search VectorDB with high-fidelity Float32Array
                    const results = await this.vectorDB.searchSimilar(embedResult.value, args.limit || 5);

                    if (!results.ok) {
                        return { ok: false, error: results.error };
                    }

                    return {
                        ok: true,
                        value: {
                            status: results.value.length > 0 ? 'results_retrieved' : 'no_matches_found',
                            results: results.value
                        }
                    };
                }
            },
            {
                name: 'index_project_files',
                description: 'Manually trigger a full codebase re-indexing for up-to-date recall.',
                parameters: {
                    type: 'object',
                    properties: {
                        force: { type: 'boolean', description: 'Ignore cache and re-index all files.' }
                    }
                },
                schema: z.object({ force: z.boolean().optional() }),
                handler: async (_args: { force?: boolean }): Promise<Result<Record<string, unknown>>> => {
                    this.logger.info('Triggering manual project indexing');
                    const stats = await this.indexer.indexProject();
                    return { ok: true, value: stats as unknown as Record<string, unknown> };
                }
            },
            {
                name: 'add_lesson',
                description: 'Manually inject a cognitive lesson, pattern, or error correction into the neural memory.',
                parameters: {
                    type: 'object',
                    properties: {
                        text: { type: 'string', description: 'The lesson content.' },
                        errorType: { type: 'string', description: 'Optional category (e.g., Syntax, Logic, Deployment).' },
                        regretLikelihood: { type: 'number', description: 'Likelihood of needing this correction again (0-1).' }
                    },
                    required: ['text']
                },
                schema: z.object({
                    text: z.string(),
                    errorType: z.string().optional(),
                    regretLikelihood: z.number().optional()
                }),
                handler: async (args): Promise<Result<void>> => {
                    this.logger.info({ text: args.text.substring(0, 50) }, 'Injecting manual lesson into VectorDB');

                    const embedResult = await this.gemini.embed(args.text);
                    if (!embedResult.ok) return { ok: false, error: embedResult.error };

                    const lesson = {
                        id: `manual_${Date.now()}`,
                        text: args.text,
                        embedding: embedResult.value,
                        createdAt: Date.now(),
                        errorType: args.errorType,
                        regretLikelihood: args.regretLikelihood || 0.5,
                        projectId: this.config.projectId || 'global',
                        sessionId: process.env['SESSION_ID'] || 'manual'
                    };

                    return this.vectorDB.addLesson(lesson);
                }
            },
            {
                name: 'get_memory_stats',
                description: 'Retrieve statistics about the current learning database.',
                parameters: { type: 'object', properties: {} },
                handler: async (): Promise<Result<{ totalLessons: number; dbPath: string }>> => {
                    const count = await this.vectorDB.getLessonCount();
                    return {
                        ok: true,
                        value: {
                            totalLessons: count,
                            dbPath: 'vibe-learning.db'
                        }
                    };
                }
            }
        ]);
    }
}
