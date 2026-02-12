import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import type { Result, VibeConfig } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { GeminiService } from '../../core/GeminiService.js';
import { VectorDB } from '../../learning/VectorDB.js';
import { StyleAnalyzer } from '../gutenberg/StyleAnalyzer.js';
import { readFileSync, existsSync } from 'fs';
import { YaoState } from '../../core/HexagramManager.js';

/**
 * StoryboardLimb - The "Storyboard Forge" service.
 * Extracts narrative beats and visual prompts from literary styles.
 */
export class StoryboardLimb extends BaseLimb {
    readonly id = 'storyboard_forge';
    readonly type = 'creative';

    constructor(
        config: VibeConfig,
        private readonly gemini: GeminiService,
        private readonly vectorDB: VectorDB,
        executor: ModelExecutor
    ) {
        super(config, executor);
        this.registerStoryboardTools();
    }

    private registerStoryboardTools(): void {
        this.registerTools([
            {
                name: 'generate_storyboard',
                description: 'Generate a sequence of narrative beats and visual prompts inspired by a specific book style.',
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'ID of the book for style inspiration' },
                        bookPath: { type: 'string', description: 'Absolute path to the book file' },
                        author: { type: 'string', description: 'Author name for tone mapping' },
                        premise: { type: 'string', description: 'The core idea for the storyboard' },
                        sceneCount: { type: 'number', description: 'Number of scenes to generate', default: 4 }
                    },
                    required: ['bookId', 'bookPath', 'author', 'premise']
                },
                schema: z.object({
                    bookId: z.number(),
                    bookPath: z.string(),
                    author: z.string(),
                    premise: z.string(),
                    sceneCount: z.number().optional().default(4)
                }),
                handler: async (args: any): Promise<Result<unknown>> => {
                    const { bookId, bookPath, author, premise, sceneCount } = args;

                    if (!existsSync(bookPath)) {
                        await this.pinPulse(YaoState.YoungYin, `Storyboard Failed: Book ${bookId} not found`);
                        return { ok: false, error: new Error(`Book file not found at ${bookPath}`) };
                    }

                    try {
                        const content = readFileSync(bookPath, 'utf8').slice(0, 5000);
                        const styleProfile = StyleAnalyzer.analyze(content);

                        const prompt = `Act as a master storyteller. Using the prose style and narrative tone of "${author}", generate a storyboard for: "${premise}".
Style Profile:
- Tone: ${styleProfile.tone}
- Sentences: ${styleProfile.avgSentenceLength}
- Readability: ${styleProfile.readabilityScore}

Generate exactly ${sceneCount} scenes. Format as JSON array of objects:
[{"title": "...", "beat": "...", "visual": "..."}]`;

                        const response = await this.gemini.generateContent(prompt);
                        if (!response.ok) {
                            await this.pinPulse(YaoState.OldYin, 'Storyboard Forge: LLM failure');
                            return { ok: false, error: response.error };
                        }

                        const jsonStr = response.value.response.match(/\[[\s\S]*\]/)?.[0] || response.value.response;
                        const storyboard = JSON.parse(jsonStr);

                        // Learning Integration
                        const embedResult = await this.gemini.embed(JSON.stringify(storyboard));
                        await this.vectorDB.addLesson({
                            id: `storyboard-${Date.now()}`,
                            text: JSON.stringify(storyboard),
                            embedding: embedResult.ok ? new Float32Array(embedResult.value) : new Float32Array(768),
                            sessionId: 'storyboarding',
                            projectId: this.config.projectId || 'global',
                            errorType: 'none',
                            createdAt: Date.now(),
                            metadata: { source: `book:${bookId}`, type: 'storyboard' }
                        });

                        await this.pinPulse(YaoState.OldYang, `Storyboard Forged: ${premise.slice(0, 20)}...`);
                        return { ok: true, value: { storyboard, styleProfile } };
                    } catch (error) {
                        await this.pinPulse(YaoState.YoungYin, 'Storyboard Forge: Processing error');
                        return { ok: false, error: error as Error };
                    }
                }
            }
        ]);
    }

}
