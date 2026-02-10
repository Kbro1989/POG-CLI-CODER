import { BaseLimb } from '../core/BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import * as fs from 'fs'; // For namespace access if needed
import { join } from 'path';
import { StyleAnalyzer } from './StyleAnalyzer.js';
import { GeminiService } from '../../core/GeminiService.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { getGutenbergPath } from '../../utils/SovereignPathResolver.js';
import { VectorDB } from '../../learning/VectorDB.js';

// Domain taxonomy for intelligent book categorization
export const GUTENBERG_DOMAINS = {
    mathematics: ['geometry', 'algebra', 'calculus', 'arithmetic', 'euclid', 'mathematical'],
    science: ['physics', 'chemistry', 'biology', 'astronomy', 'geology', 'darwin', 'scientific'],
    technology: ['engineering', 'inventions', 'machinery', 'electricity', 'tesla', 'technical'],
    construction: ['architecture', 'carpentry', 'masonry', 'building', 'vitruvius'],
    psychology: ['mind', 'behavior', 'cognitive', 'psychological', 'freud', 'mental'],
    philosophy: ['ethics', 'metaphysics', 'logic', 'reasoning', 'philosophical'],
    religion: ['bible', 'theology', 'spirituality', 'mythology', 'religious'],
    history: ['civilization', 'progression', 'chronicles', 'epochs', 'historical'],
    fantasy: ['fairy tales', 'mythology', 'legends', 'epic', 'folklore'],
    literature: ['novels', 'poetry', 'drama', 'essays', 'shakespeare', 'literary']
} as const;

interface BookMetadata {
    id: number;
    title: string;
    authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
    subjects: string[];
    languages: string[];
    download_count: number;
    formats: Record<string, string>;
}

interface GutenbergSearchRequest {
    domains?: string[];
    authors?: string[];
    search?: string;
    dateRange?: { start: number; end: number };
    limit?: number;
}

interface IngestionReport {
    total: number;
    success: number;
    failed: number;
    domains: string[];
    cacheSizeMB: number;
}

/**
 * GutenbergLimb - Literary Knowledge Ingestion
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class GutenbergLimb extends BaseLimb {
    readonly id = 'gutenberg_knowledge';
    readonly type = 'analytical' as const;

    private readonly GUTENBERG_CACHE: string;
    private readonly GUTENDEX_API = 'https://gutendex.com/books';
    private readonly RATE_LIMIT_MS = 1000;
    private lastRequestTime = 0;
    private vectorDB: VectorDB | undefined;
    private gemini: GeminiService | undefined;
    private modelExecutor: ModelExecutor | undefined;

    constructor(
        config: VibeConfig,
        vectorDB?: VectorDB,
        gemini?: GeminiService,
        modelExecutor?: ModelExecutor
    ) {
        super(config);
        this.vectorDB = vectorDB;
        this.gemini = gemini;
        this.modelExecutor = modelExecutor;


        // Priority 1: Explicitly configured gutenbergPath
        // Priority 2: Hardcoded D:\ drive (legacy/default)
        // Priority 3: Sovereign Root
        // Priority 4: Standard POG directory
        this.GUTENBERG_CACHE = this.config.gutenbergPath || getGutenbergPath();

        if (!existsSync(this.GUTENBERG_CACHE)) {
            mkdirSync(this.GUTENBERG_CACHE, { recursive: true });
            this.logger.info({ path: this.GUTENBERG_CACHE }, 'Created Gutenberg cache directory');
        }

        this.registerGutenbergTools();
    }

    private registerGutenbergTools(): void {
        this.registerTools([
            {
                name: 'gutenberg_search',
                description: 'Search or retrieve 60k+ books from Project Gutenberg by domain, author, or topic.',
                parameters: {
                    type: 'object',
                    properties: {
                        search: { type: 'string', description: 'General search term' },
                        authors: { type: 'array', items: { type: 'string' }, description: 'Specific authors' },
                        domains: { type: 'array', items: { type: 'string' }, description: 'Literary domains (e.g., science, mathematics)' },
                        limit: { type: 'number', description: 'Maximum number of results' }
                    }
                },
                handler: async (args: any) => {
                    const searchResult = await this.searchBooks(args);
                    return {
                        ok: true,
                        value: {
                            output: `Found ${searchResult.length} books.`,
                            data: { books: searchResult.slice(0, 5) }
                        }
                    };
                }
            },
            {
                name: 'gutenberg_ingest',
                description: 'Download and cache books for local knowledge base ingestion.',
                parameters: {
                    type: 'object',
                    properties: {
                        search: { type: 'string' },
                        authors: { type: 'array', items: { type: 'string' } },
                        domains: { type: 'array', items: { type: 'string' } }
                    }
                },
                handler: async (args: any) => {
                    const booksToIngest = await this.searchBooks(args);
                    const ingestResult = await this.ingestBooks(booksToIngest);
                    return {
                        ok: true,
                        value: {
                            output: `Ingested ${ingestResult.success}/${ingestResult.total} books.`,
                            data: ingestResult
                        }
                    };
                }
            },
            {
                name: 'gutenberg_styles',
                description: 'List available author styles and domains currently in the local cache.',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                handler: async () => {
                    return this.handleListStyles();
                }
            },
            {
                name: 'get_library',
                description: 'Retrieve the metadata for all locally cached books.',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                handler: async () => {
                    const books = this.loadMetadataCache();
                    return {
                        ok: true,
                        value: {
                            output: `Retrieved ${books.length} books from local library.`,
                            data: { books }
                        }
                    };
                }
            },
            {
                name: 'read_book',
                description: 'Read the contents of a locally cached book by its ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'The ID of the book to read' }
                    },
                    required: ['bookId']
                },
                handler: async (args: any) => {
                    const books = this.loadMetadataCache();
                    const book = books.find(b => b.id === args.bookId);
                    if (!book) return { ok: false, error: new Error(`Book ${args.bookId} not found in local library.`) };

                    try {
                        const content = readFileSync(book.path, 'utf8');
                        return {
                            ok: true,
                            value: {
                                output: `Retrieved content for "${book.title}" (ID: ${book.id})`,
                                data: { content, book }
                            }
                        };
                    } catch (err) {
                        return { ok: false, error: err as Error };
                    }
                }
            },
            {
                name: 'audiobook_transcribe',
                description: 'Transcribe a local audio file and add it to the book library.',
                parameters: {
                    type: 'object',
                    properties: {
                        fileName: { type: 'string', description: 'Name of the audio file in the audiobook directory' }
                    },
                    required: ['fileName']
                },
                handler: async (args: any) => {
                    const audioPath = join(this.GUTENBERG_CACHE, 'audio', args.fileName);
                    if (!fs.existsSync(audioPath)) return { ok: false, error: new Error(`Audio file ${args.fileName} not found in library audio folder.`) };

                    this.logger.info({ fileName: args.fileName }, 'Starting audiobook transcription via Whisper');

                    if (!this.modelExecutor) return { ok: false, error: new Error('ModelExecutor not initialized for transcription.') };

                    try {
                        const buffer = fs.readFileSync(audioPath);
                        const transcription = await this.modelExecutor.transcribeAudio(buffer);

                        if (!transcription.ok) return transcription;

                        // In a real scenario, we'd save this to a file and add to metadata
                        const textFileName = args.fileName.replace(/\.[^/.]+$/, "") + ".txt";
                        const textPath = join(this.GUTENBERG_CACHE, textFileName);
                        writeFileSync(textPath, transcription.value);

                        return {
                            ok: true,
                            value: {
                                output: `Successfully transcribed "${args.fileName}". Added to library as "${textFileName}".`,
                                data: { type: 'transcription_complete', fileName: args.fileName, result: transcription.value }
                            }
                        };
                    } catch (err) {
                        return { ok: false, error: err as Error };
                    }
                }
            },
            {
                name: 'narrate_book',
                description: 'Generate professional audiobook narration for a specific book.',
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'The ID of the book to narrate' },
                        style: { type: 'string', enum: ['Professional', 'Storyteller', 'Dramatic'], default: 'Professional' }
                    },
                    required: ['bookId']
                },
                handler: async (args: any) => {
                    const books = this.loadMetadataCache();
                    const book = books.find(b => b.id === args.bookId);
                    if (!book) return { ok: false, error: new Error(`Book ${args.bookId} not found in local library.`) };

                    return {
                        ok: true,
                        value: {
                            output: `Switching to audiobook narration mode for "${book.title}". Narrating in ${args.style} style.`,
                            data: {
                                type: 'narration_start',
                                bookId: book.id,
                                title: book.title,
                                style: args.style
                            }
                        }
                    };
                }
            },
            {
                name: 'generate_storyboard',
                description: 'Generate a sequence of narrative beats and visual prompts inspired by a specific book style.',
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'ID of the book for style inspiration' },
                        premise: { type: 'string', description: 'The core idea for the storyboard' },
                        sceneCount: { type: 'number', description: 'Number of scenes to generate', default: 4 }
                    },
                    required: ['bookId', 'premise']
                },
                handler: async (args: any) => {
                    const books = this.loadMetadataCache();
                    const book = books.find(b => b.id === args.bookId);
                    if (!book) return { ok: false, error: new Error(`Book ${args.bookId} not found.`) };

                    this.logger.info({ bookTitle: book.title, premise: args.premise }, 'Generating style-aware storyboard');

                    try {
                        const content = readFileSync(book.path, 'utf8').slice(0, 5000);
                        const styleProfile = StyleAnalyzer.analyze(content);

                        const prompt = `Act as a master storyteller. Using the prose style and narrative tone of "${book.author}" (specifically like "${book.title}"), generate a storyboard for the following premise: "${args.premise}".
Style Context:
- Avg Sentence Length: ${styleProfile.avgSentenceLength}
- Readability: ${styleProfile.readabilityScore}
- Tone: ${styleProfile.tone}
- Direct Snippet: "${content.slice(100, 400)}..."

Generate exactly ${args.sceneCount || 4} scenes. For each scene, provide:
1. Scene Title
2. Narrative Beat (in the author's style)
3. Visual Forge Prompt (for an image generator)

Return as JSON array of objects.`;

                        let storyboardResult: any[] = [];
                        if (this.gemini) {
                            const response = await this.gemini.generateContent(prompt);
                            if (response.ok) {
                                try {
                                    const jsonStr = response.value.response.match(/\[[\s\S]*\]/)?.[0] || response.value.response;
                                    storyboardResult = JSON.parse(jsonStr);
                                } catch (e) {
                                    this.logger.warn({ err: e }, 'Failed to parse storyboard JSON, using raw response');
                                    storyboardResult = [{ title: 'Narrative Flow', beat: response.value.response, visual: 'A literary landscape' }];
                                }
                            }
                        }

                        if (this.vectorDB && typeof this.vectorDB.addLesson === 'function' && this.gemini) {
                            const text = JSON.stringify(storyboardResult);
                            const embeddingRes = await this.gemini.embed(text);
                            const embedding = (embeddingRes.ok && embeddingRes.value) ? embeddingRes.value : new Float32Array(768);

                            await this.vectorDB.addLesson({
                                id: `storyboard-${Date.now()}`,
                                text,
                                embedding,
                                sessionId: 'storyboarding',
                                projectId: 'global',
                                errorType: 'none',
                                createdAt: Date.now(),
                                metadata: { source: `gutenberg:${book.id}`, styleProfile, type: 'storyboard' }
                            });
                        }

                        return {
                            ok: true,
                            value: {
                                output: `Generated storyboard for "${args.premise}" inspired by ${book.author}.`,
                                data: { storyboard: storyboardResult, book }
                            }
                        };
                    } catch (err) {
                        return { ok: false, error: err as Error };
                    }
                }
            },
            {
                name: 'rag_ingest_book',
                description: 'Ingests a book into the RAG memory system (Chunk -> Embed -> Store).',
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'ID of the book to ingest' }
                    },
                    required: ['bookId']
                },
                handler: async (args: any) => {
                    return this.ingestBookIntoMemory(args.bookId);
                }
            },
            {
                name: 'retrieve_context',
                description: 'Semantic search for literary context based on a query.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The semantic query (e.g., "Lovecraftian description of a variable")' },
                        limit: { type: 'number', description: 'Max number of chunks to retrieve' }
                    },
                    required: ['query']
                },
                handler: async (args: any) => {
                    return this.retrieveLiteraryContext(args.query, args.limit);
                }
            }
        ]);
    }

    override getStatus(): Record<string, any> {
        const books = this.loadMetadataCache();
        return {
            id: this.id,
            type: this.type,
            capabilities: this.spine.getCapabilities(),
            totalBooks: books.length,
            libraryPath: this.GUTENBERG_CACHE
        };
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        // +1: Explicit gutenberg/literature keywords = optimal
        const keywords = ['gutenberg', 'literature', 'author style', 'ingest book'];
        if (keywords.some(k => userIntent.includes(k))) return 1;

        // 0: General book/corpus keywords = maybe
        if (userIntent.includes('book') || userIntent.includes('corpus') || userIntent.includes('download')) return 0;

        // 0: Capability matches = maybe
        if (this.spine.getCapabilities().some(cap => userIntent.includes(cap))) return 0;

        return -1;
    }


    override async execute(intent: Intent): Promise<Result<Execution>> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        // Determine action and route through spine
        if (userIntent.includes('search') || userIntent.includes('find') || userIntent.includes('retrieve') || userIntent.includes('get') || userIntent.includes('fetch')) {
            const params = this.parseSearchParams(userIntent);
            const result = await this.spine.handleCall('gutenberg_search', params);
            if (result.ok === true) return { ok: true, value: (result as { value: any }).value };
            return { ok: false, error: (result as { error: any }).error };
        } else if (userIntent.includes('ingest') || userIntent.includes('download')) {
            const params = this.parseSearchParams(userIntent);
            const result = await this.spine.handleCall('gutenberg_ingest', params);
            if (result.ok === true) return { ok: true, value: (result as { value: any }).value };
            return { ok: false, error: (result as { error: any }).error };
        } else if (userIntent.includes('styles') || userIntent.includes('authors')) {
            const result = await this.spine.handleCall('gutenberg_styles', {});
            if (result.ok === true) return { ok: true, value: (result as { value: any }).value };
            return { ok: false, error: (result as { error: any }).error };
        }

        // Fallback to Sovereign Cognitive Response instead of failing
        return super.execute(intent);
    }

    private async handleListStyles(): Promise<Result<any>> {
        const metadata = this.loadMetadataCache();
        const authors = new Set<string>();
        const domains = new Set<string>();

        for (const book of metadata) {
            if (book.domain) domains.add(book.domain);
            if (book.author) authors.add(book.author);
        }

        return {
            ok: true,
            value: {
                output: `Available styles:\nDomains: ${Array.from(domains).join(', ')}\nAuthors: ${Array.from(authors).join(', ')}`,
                data: { domains: Array.from(domains), authors: Array.from(authors) }
            }
        };
    }

    private parseSearchParams(prompt: string): GutenbergSearchRequest {
        const params: GutenbergSearchRequest = {};

        // Extract domains
        const domainMatch = prompt.match(/domains?[:\s]+([a-z,\s]+)/i);
        if (domainMatch && domainMatch[1]) {
            params.domains = domainMatch[1].split(',').map(d => d.trim());
        }

        // Extract authors
        const authorMatch = prompt.match(/authors?[:\s]+([^,\n]+)/i);
        if (authorMatch && authorMatch[1]) {
            params.authors = authorMatch[1].split(',').map(a => a.trim());
        }

        // Extract search terms
        const searchMatch = prompt.match(/search[:\s]+([^\n]+)/i);
        if (searchMatch && searchMatch[1]) {
            params.search = searchMatch[1].trim();
        }

        // Extract limit
        const limitMatch = prompt.match(/limit[:\s]+(\d+)/i);
        if (limitMatch && limitMatch[1]) {
            params.limit = parseInt(limitMatch[1], 10);
        }

        return params;
    }

    private async searchBooks(params: GutenbergSearchRequest): Promise<BookMetadata[]> {
        let query = `${this.GUTENDEX_API}?languages=en`;

        // Build query based on params
        if (params.domains) {
            const keywords = params.domains.flatMap(d => GUTENBERG_DOMAINS[d as keyof typeof GUTENBERG_DOMAINS] || []);
            query += `&search=${keywords.join(' ')}`;
        }

        if (params.authors) {
            query += `&search=${params.authors.join(' ')}`;
        }

        if (params.search) {
            query += `&search=${encodeURIComponent(params.search)}`;
        }

        await this.respectRateLimit();

        const response = await fetch(query);
        if (!response.ok) {
            throw new Error(`Gutendex API error: ${response.statusText}`);
        }

        const data = await response.json() as { results: BookMetadata[] };
        let books = data.results;

        // Apply limit
        if (params.limit) {
            books = books.slice(0, params.limit);
        }

        return books;
    }

    private async ingestBooks(books: BookMetadata[]): Promise<IngestionReport> {
        const results = { total: books.length, success: 0, failed: 0, domains: [] as string[], cacheSizeMB: 0 };

        for (const book of books) {
            try {
                await this.downloadAndCache(book);
                results.success++;
            } catch (error) {
                this.logger.error({ bookId: book.id, error }, 'Failed to ingest book');
                results.failed++;
            }
        }

        results.cacheSizeMB = await this.getCacheSize();
        return results;
    }

    private async downloadAndCache(book: BookMetadata): Promise<void> {
        const domain = this.inferDomain(book);
        const cachePath = join(this.GUTENBERG_CACHE, 'domains', domain, `${book.id}.txt`);

        // Skip if already cached
        if (existsSync(cachePath)) {
            this.logger.debug({ bookId: book.id }, 'Book already cached');
            return;
        }

        // Find plain text URL
        const textUrl = book.formats['text/plain; charset=utf-8'] ||
            book.formats['text/plain'] ||
            `https://www.gutenberg.org/files/${book.id}/${book.id}-0.txt`;

        await this.respectRateLimit();

        const response = await fetch(textUrl);
        if (!response.ok) {
            throw new Error(`Failed to download book ${book.id}: ${response.statusText}`);
        }

        const text = await response.text();

        // Cache locally
        mkdirSync(join(this.GUTENBERG_CACHE, 'domains', domain), { recursive: true });
        writeFileSync(cachePath, text);

        // Update metadata cache
        this.updateMetadataCache({
            id: book.id,
            title: book.title,
            author: book.authors[0]?.name || 'Unknown',
            domain,
            path: cachePath
        });

        this.logger.info({ bookId: book.id, domain, title: book.title }, 'Book cached successfully');


        // Integrating Learning Mechanism with Style Analysis
        if (this.vectorDB && typeof this.vectorDB.addLesson === 'function') {
            try {
                const styleProfile = StyleAnalyzer.analyze(text);

                // Generate embedding if Gemini service is available
                let embedding = new Float32Array(0);
                if (this.gemini) {
                    // Truncate text for embedding if too long (Gemini limits)
                    const textForEmbedding = text.slice(0, 10000);
                    const embedResult = await this.gemini.embed(textForEmbedding);
                    if (embedResult.ok) {
                        embedding = new Float32Array(embedResult.value);
                    }
                }

                await this.vectorDB.addLesson({
                    id: `gutenberg-${book.id}`,
                    text: text,
                    embedding: embedding,
                    sessionId: 'gutenberg-ingestion',
                    projectId: 'global',
                    errorType: '',
                    createdAt: Date.now(),
                    metadata: {
                        source: `gutenberg:${book.id}`,
                        category: domain,
                        styleProfile // Inject style data
                    }
                });
                this.logger.info({ bookId: book.id, style: styleProfile }, 'Book ingested with style profile and embedding');
            } catch (err) {
                this.logger.error({ err, bookId: book.id }, 'Failed to index book into VectorDB');
            }
        }
    }

    private inferDomain(book: BookMetadata): string {
        const text = `${book.title} ${book.subjects.join(' ')}`.toLowerCase();

        for (const [domain, keywords] of Object.entries(GUTENBERG_DOMAINS)) {
            if (keywords.some(kw => text.includes(kw))) {
                return domain;
            }
        }

        return 'uncategorized';
    }

    private async respectRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
            await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest));
        }

        this.lastRequestTime = Date.now();
    }

    // ============================================================
    // RAG PIPELINE IMPLEMENTATION
    // ============================================================

    /**
     * Ingests a book into the vector database for RAG.
     */
    private async ingestBookIntoMemory(bookId: number): Promise<Result<void>> {
        if (!this.vectorDB || !this.gemini) {
            return { ok: false, error: new Error('VectorDB or GeminiService not available') };
        }

        const books = this.loadMetadataCache();
        const book = books.find(b => b.id === bookId);
        if (!book) return { ok: false, error: new Error(`Book ${bookId} not found in local library`) };

        try {
            this.logger.info({ bookId, title: book.title }, 'Starting RAG ingestion...');

            // 1. Read Content
            // Try explicit path first, then fallback to cache pattern
            let contentPath = book.path;
            if (!contentPath || !existsSync(contentPath)) {
                contentPath = join(this.GUTENBERG_CACHE, `top_100_${bookId}.txt`);
            }

            if (!existsSync(contentPath)) {
                return { ok: false, error: new Error(`Content file not found for book ${bookId}`) };
            }

            const content = readFileSync(contentPath, 'utf8');

            // 2. Chunk Content (Sliding Window)
            const chunks = this.chunkText(content, 1000, 100);
            this.logger.info({ chunks: chunks.length }, 'Content chunked');

            // 3. Generate Embeddings (Batch Process)
            const storedChunks = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunkText = chunks[i];
                if (!chunkText) continue;

                // Generate embedding using Gemini
                const embeddingResult = await this.gemini.embed(chunkText);

                if (embeddingResult.ok && embeddingResult.value) {
                    storedChunks.push({
                        id: `${bookId}_${i}`,
                        bookId: bookId,
                        chunkIndex: i,
                        content: chunkText,
                        embedding: new Float32Array(embeddingResult.value),
                        metadata: { title: book.title, author: book.author }
                    });
                }

                // Rate limit protection
                if (i % 10 === 0) await new Promise(r => setTimeout(r, 200));
            }

            // 4. Store in VectorDB
            await this.vectorDB.storeGutenbergChunks(storedChunks);

            this.logger.info({ bookId, count: storedChunks.length }, 'RAG ingestion complete');
            return { ok: true, value: undefined };

        } catch (error) {
            this.logger.error({ error, bookId }, 'RAG ingestion failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Retrieves semantic context from the literary memory.
     */
    private async retrieveLiteraryContext(query: string, limit: number = 5): Promise<Result<string[]>> {
        if (!this.vectorDB || !this.gemini) {
            return { ok: false, error: new Error('VectorDB or GeminiService not available') };
        }

        try {
            // 1. Embed Query
            const queryEmbedding = await this.gemini.embed(query);
            if (!queryEmbedding.ok || !queryEmbedding.value) {
                return { ok: false, error: new Error('Failed to generate query embedding') };
            }

            // 2. Vector Search
            const results = await this.vectorDB.searchGutenberg(new Float32Array(queryEmbedding.value), limit);

            if (!results.ok) return { ok: false, error: results.error };

            // 3. Format Output
            const context = results.value.map((r: any) =>
                `[Source: ${r.metadata.title} by ${r.metadata.author}]\n${r.content}`
            );

            return { ok: true, value: context };

        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Sliding window text chunking.
     */
    private chunkText(text: string, windowSize: number, overlap: number): string[] {
        const words = text.split(/\s+/);
        const chunks = [];
        let index = 0;

        while (index < words.length) {
            const chunk = words.slice(index, index + windowSize).join(' ');
            chunks.push(chunk);
            index += (windowSize - overlap);
        }

        return chunks;
    }

    private loadMetadataCache(): Array<{ id: number; title: string; author: string; domain: string; path: string }> {
        const metadataPath = join(this.GUTENBERG_CACHE, 'metadata.json');
        if (!existsSync(metadataPath)) {
            return [];
        }

        try {
            return JSON.parse(readFileSync(metadataPath, 'utf8'));
        } catch {
            return [];
        }
    }

    private updateMetadataCache(entry: { id: number; title: string; author: string; domain: string; path: string }): void {
        const metadata = this.loadMetadataCache();
        metadata.push(entry);

        const metadataPath = join(this.GUTENBERG_CACHE, 'metadata.json');
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    private async getCacheSize(): Promise<number> {
        // Simplified: just return 0 for now, can implement proper size calculation later
        return 0;
    }
}
