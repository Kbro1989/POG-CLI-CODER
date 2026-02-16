import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import type { Intent, Execution, TernaryDecision } from '../core/NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { YaoState } from '../../core/models.js';
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
    science: ['physics', 'chemistry', 'biology', 'astronomy', 'geology', 'darwin', 'scientific', 'mechanism', 'evolution'],
    technology: ['engineering', 'inventions', 'machinery', 'electricity', 'tesla', 'technical'],
    construction: ['architecture', 'carpentry', 'masonry', 'building', 'vitruvius'],
    psychology: ['mind', 'behavior', 'cognitive', 'psychological', 'freud', 'mental'],
    philosophy: ['logic', 'ethics', 'metaphysics', 'epistemology', 'plato', 'aristotle', 'nietzsche', 'hegel', 'kant', 'reflective'],
    religion: ['bible', 'theology', 'spirituality', 'mythology', 'religious'],
    history: ['civilization', 'progression', 'chronicles', 'epochs', 'historical', 'ancient', 'modern', 'renaissance', 'empire'],
    fantasy: ['fairy tales', 'mythology', 'legends', 'epic', 'folklore', 'faerie', 'enchanted'],
    gothic: ['horror', 'ghost', 'vampire', 'supernatural', 'terror', 'mystery', 'macabre', 'lovecraft', 'poe'],
    literature: ['novels', 'poetry', 'drama', 'essays', 'shakespeare', 'literary', 'classic', 'fiction', 'prose', 'victorian', 'customs', 'society']
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
    private readonly vectorDB: VectorDB | undefined;
    private readonly gemini: GeminiService | undefined;
    private readonly modelExecutor: ModelExecutor | undefined;

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
                schema: z.object({
                    search: z.string().optional(),
                    authors: z.array(z.string()).optional(),
                    domains: z.array(z.string()).optional(),
                    limit: z.number().optional()
                }),
                handler: async (args: any) => {
                    const searchResult = await this.searchBooks(args);
                    await this.pinPulse(YaoState.YoungYang, `Library Search: ${args.search || 'Global Scan'}`);
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
                schema: z.object({
                    search: z.string().optional(),
                    authors: z.array(z.string()).optional(),
                    domains: z.array(z.string()).optional()
                }),
                handler: async (args: any) => {
                    const booksToIngest = await this.searchBooks(args);
                    const ingestResult = await this.ingestBooks(booksToIngest);

                    if (ingestResult.success > 0) {
                        await this.pinPulse(YaoState.OldYang, `Ingestion Pulse: ${ingestResult.success} books captured`);
                    } else if (ingestResult.failed > 0) {
                        await this.pinPulse(YaoState.YoungYin, 'Ingestion Pulse: Fault in capture stream');
                    }

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
                schema: z.object({}),
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
                schema: z.object({}),
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
                schema: z.object({
                    bookId: z.number().describe('The ID of the book to read')
                }),
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
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        fileName: { type: 'string', description: 'Name of the audio file in the audiobook directory' }
                    },
                    required: ['fileName']
                },
                schema: z.object({
                    fileName: z.string().describe('Name of the audio file in the audiobook directory')
                }),
                handler: async (args: any) => {
                    const audioPath = join(this.GUTENBERG_CACHE, 'audio', args.fileName);
                    if (!fs.existsSync(audioPath)) return { ok: false, error: new Error(`Audio file ${args.fileName} not found in library audio folder.`) };

                    this.logger.info({ fileName: args.fileName }, 'Starting audiobook transcription via Whisper');

                    if (!this.modelExecutor) return { ok: false, error: new Error('ModelExecutor not initialized for transcription.') };

                    try {
                        const buffer = fs.readFileSync(audioPath);
                        const transcription = await this.modelExecutor.transcribeAudio(buffer);

                        if (!transcription.ok) return transcription;

                        // Save this to a file and add to metadata
                        const textFileName = args.fileName.replace(/\.[^/.]+$/, "") + ".txt";
                        const textPath = join(this.GUTENBERG_CACHE, textFileName);
                        writeFileSync(textPath, transcription.value);

                        // Update metadata cache to make it reachable in the library
                        this.updateMetadataCache({
                            id: Date.now(), // Generate a unique ID
                            title: `Transcribed: ${args.fileName}`,
                            author: 'Sovereign Whisper Engine',
                            domain: 'transcription',
                            path: textPath
                        });

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
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'The ID of the book to narrate' },
                        style: { type: 'string', enum: ['Professional', 'Storyteller', 'Dramatic'], default: 'Professional' }
                    },
                    required: ['bookId']
                },
                schema: z.object({
                    bookId: z.number().describe('The ID of the book to narrate'),
                    style: z.enum(['Professional', 'Storyteller', 'Dramatic']).optional().default('Professional').describe('Narration style')
                }),
                handler: async (args: any) => {
                    const books = this.loadMetadataCache();
                    const book = books.find(b => b.id === args.bookId);
                    if (!book) return { ok: false, error: new Error(`Book ${args.bookId} not found in local library.`) };

                    // Real Logic: Record the narration request in a local manifest for the audio worker to pick up
                    const narrationPath = join(this.GUTENBERG_CACHE, 'narration_queue.json');
                    let queue: any[] = [];
                    if (fs.existsSync(narrationPath)) {
                        queue = JSON.parse(fs.readFileSync(narrationPath, 'utf8'));
                    }

                    const entry = {
                        bookId: book.id,
                        title: book.title,
                        style: args.style,
                        status: 'QUEUED',
                        timestamp: Date.now()
                    };

                    queue.push(entry);
                    fs.writeFileSync(narrationPath, JSON.stringify(queue, null, 2));

                    await this.pinPulse(YaoState.YoungYang, `Narration Pulse: ${book.title} queued for generation`);

                    return {
                        ok: true,
                        value: {
                            output: `Successfully queued "${book.title}" for professional narration (${args.style} style).`,
                            data: entry
                        }
                    };
                }
            },
            {
                name: 'gutenberg_analyze_style',
                description: 'Analyze the literary style of a locally cached book.',
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'The ID of the book to analyze' }
                    },
                    required: ['bookId']
                },
                schema: z.object({
                    bookId: z.number().describe('The ID of the book to analyze')
                }),
                handler: async (args: any) => {
                    const books = this.loadMetadataCache();
                    const book = books.find(b => b.id === args.bookId);
                    if (!book) return { ok: false, error: new Error(`Book ${args.bookId} not found in local library.`) };

                    try {
                        const content = readFileSync(book.path, 'utf8');
                        const styleProfile = StyleAnalyzer.analyze(content);
                        return {
                            ok: true,
                            value: {
                                output: `Style analysis complete for "${book.title}".`,
                                data: { styleProfile, book }
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
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'ID of the book to ingest' }
                    },
                    required: ['bookId']
                },
                schema: z.object({
                    bookId: z.number().describe('ID of the book to ingest')
                }),
                handler: async (args: any) => {
                    return this.ingestBookIntoMemory(args.bookId);
                }
            },
            {
                name: 'retrieve_context',
                description: 'Semantic search for literary context based on a query.',
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The semantic query (e.g., "Lovecraftian description of a variable")' },
                        limit: { type: 'number', description: 'Max number of chunks to retrieve' }
                    },
                    required: ['query']
                },
                schema: z.object({
                    query: z.string().describe('The semantic query (e.g., "Lovecraftian description of a variable")'),
                    limit: z.number().optional().default(5).describe('Max number of chunks to retrieve')
                }),
                handler: async (args: any) => {
                    return this.retrieveLiteraryContext(args.query, args.limit);
                }
            },
            {
                name: 'gutenberg_master_style',
                description: 'Analyze a book and adopt its literary style as the system persona.',
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        bookId: { type: 'number', description: 'The ID of the book to master' }
                    },
                    required: ['bookId']
                },
                schema: z.object({
                    bookId: z.number().describe('The ID of the book to master')
                }),
                handler: async (args: any) => {
                    const books = this.loadMetadataCache();
                    const book = books.find(b => b.id === args.bookId);
                    if (!book) return { ok: false, error: new Error(`Book ${args.bookId} not found in local library.`) };

                    const activeBook: any = book;

                    try {
                        const content = readFileSync(activeBook.path, 'utf8');
                        const styleProfile = StyleAnalyzer.analyze(content);
                        const profileWithMeta = {
                            ...styleProfile,
                            author: activeBook.authors && activeBook.authors[0] ? activeBook.authors[0].name : 'Unknown Author',
                            title: activeBook.title
                        };

                        // Apply to config (in-memory update)
                        (this.config as any).activeStyle = profileWithMeta;

                        // Persistent Storyboard Creation (D:\ Drive via Lessons)
                        // Trigger storyboardforge if it's enabled
                        if (this.config.enabledServices.includes('storyboard_forge')) {
                            this.logger.info(`Triggering Storyboard Forge for ${activeBook.title}`);
                            await this.spine.handleCall('generate_storyboard', {
                                bookId: activeBook.id,
                                bookPath: activeBook.path,
                                author: profileWithMeta.author,
                                premise: `A discourse in the style of ${profileWithMeta.author}`,
                                sceneCount: 2
                            });
                        }

                        await this.pinPulse(YaoState.OldYang, `Style Mastery: Absorbed the essence of ${activeBook.title}. Substrate D:\\ updated.`);

                        return {
                            ok: true,
                            value: {
                                output: `Style Mastery complete. The system has absorbed the stylistic markers of "${activeBook.title}" by ${profileWithMeta.author}. This persona is now active across all conversational interfaces.`,
                                data: { styleProfile: profileWithMeta }
                            }
                        };
                    } catch (err) {
                        return { ok: false, error: err as Error };
                    }
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
        const base = await super.canHandle(intent);
        if (base === 'Yin') return 'Yin';

        const userIntent = this.getUserIntent(intent).toLowerCase();

        // 'Yang': Explicit gutenberg/literature keywords = optimal
        const keywords = ['gutenberg', 'literature', 'author style', 'ingest book'];
        if (keywords.some(k => userIntent.includes(k))) return 'Yang';

        // 'YinYang': General book/corpus keywords = maybe
        if (userIntent.includes('book') || userIntent.includes('corpus') || userIntent.includes('download')) return 'YinYang';

        // 'YinYang': Capability matches = maybe
        if (this.spine.getCapabilities().some(cap => userIntent.includes(cap))) return 'YinYang';

        return 'Yin';
    }


    override async execute(intent: Intent): Promise<Result<Execution>> {
        const userIntent = this.getUserIntent(intent).toLowerCase();

        // Determine action and route through spine
        if (userIntent.includes('search') || userIntent.includes('find') || userIntent.includes('retrieve') || userIntent.includes('get') || userIntent.includes('fetch')) {
            const params = this.parseSearchParams(userIntent);
            const result = await this.spine.handleCall<Execution>('gutenberg_search', params as unknown as Record<string, unknown>);
            if (result.ok) return result;
            const error = (result as { ok: false; error: Error }).error;
            return { ok: false, error };
        } else if (userIntent.includes('ingest') || userIntent.includes('download')) {
            const params = this.parseSearchParams(userIntent);
            const result = await this.spine.handleCall<Execution>('gutenberg_ingest', params as unknown as Record<string, unknown>);
            if (result.ok) return result;
            const error = (result as { ok: false; error: Error }).error;
            return { ok: false, error };
        } else if (userIntent.includes('styles') || userIntent.includes('authors')) {
            const result = await this.spine.handleCall<Execution>('gutenberg_styles', {});
            if (result.ok) return result;
            const error = (result as { ok: false; error: Error }).error;
            return { ok: false, error };
        }

        // Fallback to Sovereign Cognitive Response instead of failing
        return super.execute(intent);
    }

    private async handleListStyles(): Promise<Result<Execution>> {
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

        // Infer domain with content awareness
        const domain = this.inferDomain(book, text);

        // Standardize naming: Title_Author_ID.txt
        const sanitizedTitle = book.title.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 50);
        const authorName = book.authors[0]?.name || 'Unknown';
        const sanitizedAuthor = authorName.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').slice(0, 30);
        const fileName = `${sanitizedTitle}_${sanitizedAuthor}_${book.id}.txt`;
        const cachePath = join(this.GUTENBERG_CACHE, 'domains', domain, fileName);

        // Skip if already cached (checking both path and ID in metadata)
        const metadata = this.loadMetadataCache();
        if (metadata.some(m => m.id === book.id && existsSync(m.path))) {
            this.logger.debug({ bookId: book.id }, 'Book already cached');
            return;
        }

        // Cache locally
        mkdirSync(join(this.GUTENBERG_CACHE, 'domains', domain), { recursive: true });
        writeFileSync(cachePath, text);

        // Update metadata cache
        this.updateMetadataCache({
            id: book.id,
            title: book.title,
            author: authorName,
            domain,
            path: cachePath
        });

        this.logger.info({ bookId: book.id, domain, title: book.title, fileName }, 'Book cached with descriptive naming');


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

    private inferDomain(book: BookMetadata, content?: string): string {
        const metadataText = `${book.title} ${book.subjects.join(' ')}`.toLowerCase();

        // 1. Keyword Taxonomy Match
        for (const [domain, keywords] of Object.entries(GUTENBERG_DOMAINS)) {
            if (keywords.some(kw => metadataText.includes(kw))) {
                return domain;
            }
        }

        // 2. Content-Aware Fallback
        if (content) {
            const head = content.slice(0, 2000).toLowerCase();
            if (head.includes('chapter i') || head.includes('contents') || head.includes('preface')) {
                return 'literature'; // Likely a novel or structured literary work
            }
            if (head.includes('theorem') || head.includes('q.e.d') || head.includes('equation')) {
                return 'mathematics';
            }
            if (head.includes('experiment') || head.includes('observation') || head.includes('data')) {
                return 'science';
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

            if (!results.ok) {
                const error = (results as { ok: false; error: Error }).error;
                return { ok: false, error };
            }

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
