import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import { type Result, type VibeConfig } from '../../core/models.js';

/**
 * WebSensoryLimb - Provides real-time internet grounding.
 * 
 * Capabilities:
 * - google_search: Grounding via Google Custom Search API.
 * - web_fetch: Direct URL content extraction and markdown conversion.
 */
export class WebSensoryLimb extends BaseLimb {
    readonly id = 'web_sensory';
    readonly type = 'sensory';

    constructor(config: VibeConfig) {
        super(config);
        this.registerWebTools();
    }

    private registerWebTools(): void {
        this.registerTools([
            {
                name: 'google_search',
                description: 'Search the live web for real-time information, news, or documentation.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'The search query.' },
                        limit: { type: 'number', description: 'Number of results (1-10).' }
                    },
                    required: ['query']
                },
                schema: z.object({
                    query: z.string(),
                    limit: z.number().optional()
                }),
                handler: async (args: any) => this.performSearch(args['query'], args['limit'] || 5)
            },
            {
                name: 'web_fetch',
                description: 'Fetch the text content of a URL and convert it to clean markdown.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'The URL to fetch.' }
                    },
                    required: ['url']
                },
                schema: z.object({
                    url: z.string().url()
                }),
                handler: async (args: any) => this.fetchUrl(args['url'])
            }
        ]);
    }

    private async performSearch(query: string, limit: number): Promise<Result<any>> {
        const apiKey = process.env['GOOGLE_SEARCH_API_KEY'];
        const cx = process.env['GOOGLE_SEARCH_CX'];

        if (!apiKey || !cx) {
            this.logger.warn('Google Search API credentials missing. Falling back to placeholder.');
            return {
                ok: true,
                value: {
                    status: 'fallback',
                    message: 'Google Search API keys not configured. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX.',
                    results: [
                        { title: 'Simulated Search Result', snippet: `Real-time data for "${query}" requires API configuration.`, link: 'https://google.com' }
                    ]
                }
            };
        }

        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&num=${limit}`;
            const response = await fetch(url);

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Google Search API error: ${error}`);
            }

            const data = (await response.json()) as any;
            const results = (data.items || []).map((item: any) => ({
                title: item.title,
                snippet: item.snippet,
                link: item.link
            }));

            return {
                ok: true,
                value: {
                    status: 'success',
                    query,
                    results
                }
            };
        } catch (error) {
            this.logger.error({ query, error }, 'Web search failed');
            return { ok: false, error: error as Error };
        }
    }

    private async fetchUrl(url: string): Promise<Result<any>> {
        try {
            this.logger.info({ url }, 'Fetching web content');
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) POG-Substrate/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
            }

            const content = await response.text();

            // Simple markdown-ish conversion for text/html
            // In a full implementation, we'd use Turndown. For now, we strip tags and return clean text.
            const cleanContent = content
                .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, '')
                .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gmi, '')
                .replace(/<[^>]+>/g, '\n')
                .replace(/\n\s*\n/g, '\n\n')
                .trim();

            return {
                ok: true,
                value: {
                    url,
                    title: url, // Could be parsed from <title>
                    content: cleanContent.substring(0, 10000) // Limit to 10k chars for context safety
                }
            };
        } catch (error) {
            this.logger.error({ url, error }, 'Web fetch failed');
            return { ok: false, error: error as Error };
        }
    }
}
