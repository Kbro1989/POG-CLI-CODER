import { execSync } from 'child_process';
import pino from 'pino';
import { Result } from '../core/models.js';

const logger = pino({
    name: 'CloudflareServices',
    base: { hostname: 'POG-VIBE' }
});

export interface CloudflareConfig {
    accountId?: string;
    apiToken?: string;
    gatewayUrl?: string;
}

/**
 * CloudflareServices - "Packed" Workers AI & Substrate Layer
 * Supports automated account detection and free-tier optimization.
 */
export class CloudflareServices {
    private accountId: string | undefined;
    private apiToken: string | undefined;
    private readonly baseUrl: string = 'https://api.cloudflare.com/client/v4/accounts';

    private readonly config: CloudflareConfig;

    constructor(config: CloudflareConfig) {
        this.config = config;
        this.accountId = config.accountId;
        this.apiToken = config.apiToken;
    }

    /**
     * Automated Ability Detection via wrangler
     */
    async auditAbilities(): Promise<Result<{ accountId: string; status: string }>> {
        try {
            if (!this.accountId) {
                logger.info('Attempting automated Cloudflare account detection via wrangler...');
                const output = execSync('wrangler whoami').toString();

                // Extract account ID from wrangler output using regex
                // Typical output format contains Account ID: <id>
                const match = output.match(/Account ID:\s+([a-f0-9]+)/i);
                if (match && match[1]) {
                    this.accountId = match[1];
                    logger.info({ accountId: this.accountId }, 'Cloudflare account detected');
                } else {
                    return { ok: false, error: new Error('Could not detect Cloudflare Account ID. Please set CLOUDFLARE_ACCOUNT_ID.') };
                }
            }

            return { ok: true, value: { accountId: this.accountId, status: 'AUTHORIZED' } };
        } catch (error) {
            logger.error({ error }, 'Cloudflare ability audit failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Run a Workers AI model with free-tier prioritization and Universal Hub support
     */
    async runAi<T = any>(model: string, input: any): Promise<Result<T>> {
        if (!this.accountId || !this.apiToken) {
            return { ok: false, error: new Error('Cloudflare credentials missing') };
        }

        // Prefer Universal Hub if configured via gatewayUrl
        const url = this.getHubUrl(`ai/run/${model}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(input)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as any;
                const message = errorData?.errors?.[0]?.message || errorData?.error || `Cloudflare error: ${response.status}`;
                return { ok: false, error: new Error(message) };
            }

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('image/')) {
                const buffer = await response.arrayBuffer();
                return { ok: true, value: Buffer.from(buffer) as any };
            }

            const data = await response.json() as any;

            // Standard API returns { success, result, ... }, Hub might return direct result
            if (data.success === false) {
                return { ok: false, error: new Error(data.errors?.[0]?.message || 'Execution failed') };
            }

            return { ok: true, value: (data.result !== undefined ? data.result : data) as T };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Call a deterministic Ghost Limb task
     */
    async runGhostLimb<T = any>(task: string, input: any): Promise<Result<T>> {
        const url = this.getHubUrl(`deterministic/${task}`);
        if (!url.includes('workers.dev') && !url.includes('localhost')) {
            return { ok: false, error: new Error('Universal Hub URL required for Ghost Limb tasks') };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(input)
            });

            if (!response.ok) throw new Error(`Ghost Hub failed: ${response.status}`);
            const data = await response.json() as T;
            return { ok: true, value: data };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private getHubUrl(path: string): string {
        const base = this.config.gatewayUrl || `${this.baseUrl}/${this.accountId}/`;
        return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
    }

    /**
     * Store object in R2 bucket
     */
    async putObject(bucket: string, key: string, data: string | Uint8Array, contentType: string): Promise<Result<void>> {
        if (!this.accountId || !this.apiToken) return { ok: false, error: new Error('Missing CF credentials') };

        const url = `${this.baseUrl}/${this.accountId}/r2/buckets/${bucket}/objects/${key}`;
        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': contentType
                },
                body: data
            });

            if (!response.ok) {
                const err = await response.text();
                return { ok: false, error: new Error(`R2 Upload failed: ${response.status} - ${err}`) };
            }

            return { ok: true, value: undefined };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Retrieve object from R2 bucket
     */
    async getObject(bucket: string, key: string): Promise<Result<Uint8Array>> {
        if (!this.accountId || !this.apiToken) return { ok: false, error: new Error('Missing CF credentials') };

        const url = `${this.baseUrl}/${this.accountId}/r2/buckets/${bucket}/objects/${key}`;
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`
                }
            });

            if (!response.ok) {
                return { ok: false, error: new Error(`R2 Download failed: ${response.status}`) };
            }

            return { ok: true, value: new Uint8Array(await response.arrayBuffer()) };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Edge-Baking: Use Cloudflare Workers AI for high-speed procedural generation (Boilerplate, Styles, etc.)
     */
    async edgeBake(prompt: string, type: 'style' | 'markup' | 'logic'): Promise<Result<string>> {
        const systemPrompt = `You are an Edge Procedural Generator. Output ONLY raw ${type} code. No markdown, no explanations.`;
        const primaryModel = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
        const fallbackModel = '@cf/meta/llama-3.1-8b-instruct';

        let result = await this.runAi(primaryModel, {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        });

        if (result.ok === false) {
            const error = (result as { error: Error }).error;
            logger.warn({ model: primaryModel, error: error.message }, 'Edge-Bake primary model failed - falling back to 8B');
            result = await this.runAi(fallbackModel, {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ]
            });
        }

        if (result.ok === false) return result;
        const value = (result as { value: any }).value;
        return { ok: true, value: value.response || '' };
    }

    /**
     * Safe unwrap of Account ID
     */
    getAccountId(): string | undefined {
        return this.accountId;
    }
}
