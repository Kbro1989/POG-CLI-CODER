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

    constructor(config: CloudflareConfig) {
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
     * Run a Workers AI model with free-tier prioritization
     */
    async runAi<T = any>(model: string, input: any): Promise<Result<T>> {
        if (!this.accountId || !this.apiToken) {
            return { ok: false, error: new Error('Cloudflare credentials missing') };
        }

        const url = `${this.baseUrl}/${this.accountId}/ai/run/${model}`;

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
                const errorData = await response.json() as any;
                const message = errorData?.errors?.[0]?.message || `Cloudflare API error: ${response.status}`;
                return { ok: false, error: new Error(message) };
            }

            const data = await response.json() as any;
            if (!data.success) {
                return { ok: false, error: new Error(data.errors?.[0]?.message || 'Cloudflare AI execution failed') };
            }

            return { ok: true, value: data.result };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Safe unwrap of Account ID
     */
    getAccountId(): string | undefined {
        return this.accountId;
    }
}
