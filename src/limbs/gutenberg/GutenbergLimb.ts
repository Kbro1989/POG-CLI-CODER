import { NeuralLimb, Intent, Execution } from '../core/NeuralLimb.js';
import { Result } from '../../core/models.js';
import pino from 'pino';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const logger = pino({
    name: 'GutenbergLimb',
    base: { hostname: 'POG-VIBE' }
});

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

export class GutenbergLimb implements NeuralLimb {
    id = 'gutenberg_knowledge';
    type = 'analytical' as const;
    capabilities = ['gutenberg_search', 'gutenberg_ingest', 'gutenberg_styles'];

    private readonly GUTENBERG_CACHE = 'D:/pog-gutenberg';
    private readonly GUTENDEX_API = 'https://gutendex.com/books';
    private readonly RATE_LIMIT_MS = 1000; // 1 request per second (polite)
    private lastRequestTime = 0;

    constructor() {
        // Ensure cache directory exists
        if (!existsSync(this.GUTENBERG_CACHE)) {
            mkdirSync(this.GUTENBERG_CACHE, { recursive: true });
            logger.info({ path: this.GUTENBERG_CACHE }, 'Created Gutenberg cache directory');
        }
    }

    async canHandle(intent: Intent): Promise<boolean> {
        const prompt = intent.prompt.toLowerCase();
        const keywords = ['gutenberg', 'book', 'ingest', 'download', 'corpus', 'literature', 'author style'];
        return keywords.some(k => prompt.includes(k));
    }

    async execute(intent: Intent): Promise<Result<Execution>> {
        const prompt = intent.prompt.toLowerCase();

        // Determine action
        if (prompt.includes('search') || prompt.includes('find') || prompt.includes('retrieve') || prompt.includes('get') || prompt.includes('fetch')) {
            return await this.handleSearch(intent.prompt);
        } else if (prompt.includes('ingest') || prompt.includes('download')) {
            return await this.handleIngest(intent.prompt);
        } else if (prompt.includes('styles') || prompt.includes('authors')) {
            return await this.handleListStyles();
        }

        return { ok: false, error: new Error('Unknown Gutenberg action. Use: search, ingest, or styles') };
    }

    private async handleSearch(prompt: string): Promise<Result<Execution>> {
        try {
            const params = this.parseSearchParams(prompt);
            const books = await this.searchBooks(params);

            return {
                ok: true,
                value: {
                    output: `Found ${books.length} books matching your criteria`,
                    data: { books: books.slice(0, 10) } // Return top 10
                }
            };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private async handleIngest(prompt: string): Promise<Result<Execution>> {
        try {
            const params = this.parseSearchParams(prompt);
            const books = await this.searchBooks(params);

            logger.info({ count: books.length }, 'Starting book ingestion');

            const results = await this.ingestBooks(books);

            return {
                ok: true,
                value: {
                    output: `Ingested ${results.success}/${results.total} books. Cache: ${results.cacheSizeMB}MB`,
                    data: results
                }
            };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
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
                logger.error({ bookId: book.id, error }, 'Failed to ingest book');
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
            logger.debug({ bookId: book.id }, 'Book already cached');
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

        logger.info({ bookId: book.id, domain, title: book.title }, 'Book cached successfully');
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
