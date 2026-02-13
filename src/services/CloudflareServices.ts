import { execSync } from 'child_process';
import pino from 'pino';
import { Result } from '../core/models.js';
import { HexagramManager, YaoState } from '../core/HexagramManager.js';

const logger = pino({
    name: 'CloudflareServices',
    base: { hostname: 'POG-VIBE' }
});

export interface CloudflareConfig {
    accountId?: string;
    apiToken?: string;
    authEmail?: string | undefined;
    gatewayUrl?: string | undefined;
    bindingUrl?: string | undefined;
    hexagramManager?: HexagramManager | undefined;
}

/**
 * CloudflareServices - "Packed" Workers AI & Substrate Layer
 * Supports automated account detection and free-tier optimization.
 */
export class CloudflareServices {
    private accountId: string | undefined;
    private readonly apiToken: string | undefined;
    private authEmail: string | undefined;
    private readonly baseUrl: string = 'https://api.cloudflare.com/client/v4/accounts';

    private readonly config: CloudflareConfig;
    private readonly hexagramManager: HexagramManager | undefined;

    constructor(config: CloudflareConfig) {
        this.config = config;
        this.accountId = (config.accountId || process.env['CLOUDFLARE_ACCOUNT_ID'] || '').trim();
        this.apiToken = (config.apiToken || process.env['CLOUDFLARE_API_TOKEN'] || process.env['CLOUDFLARE_API_KEY'] || '').trim();
        this.authEmail = (config.authEmail || process.env['CLOUDFLARE_AUTH_EMAIL'] || '').trim();
        this.hexagramManager = config.hexagramManager;
    }

    public getAccountId(): string | undefined {
        return this.accountId;
    }

    /**
     * Auto-detect Cloudflare account ID from local wrangler context if not provided
     * Now returns a ternary status: 1 (Global), 0 (Token), -1 (Unauth)
     */
    async auditAbilities(): Promise<Result<{ accountId?: string; status: number }>> {
        try {
            // If missing accountId or email, try to get it from wrangler
            if (!this.accountId || !this.authEmail) {
                logger.info('Attempting to complete Cloudflare context via wrangler...');
                const output = execSync('wrangler whoami').toString();

                const match = output.match(/Account ID:\s+([a-f0-9]+)/i);
                if (match && match[1]) {
                    this.accountId = match[1].trim();
                }

                const emailMatch = output.match(/associated with the email\s+([^\s]+)/i);
                if (emailMatch && emailMatch[1]) {
                    // Remove trailing dot if present (common in "email@domain.com.")
                    this.authEmail = emailMatch[1].trim().replace(/\.$/, '');
                }
            }

            // Verify Token
            const verification = await this.verifyToken();
            if (!verification.ok) {
                return { ok: false, error: new Error(`Token verification failed: ${verification.error.message}`) };
            }

            // Determine Ternary Status
            const ternaryStatus = this.useGlobalKey ? 1 : 0;

            // Pin Auth Hex Card (Line 4: Environment)
            if (this.hexagramManager) {
                void this.hexagramManager.pinCard(4, 'Cloudflare Auth State',
                    this.useGlobalKey ? 'Sovereign Global Key active' : 'Standard API Token active',
                    this.useGlobalKey ? YaoState.OldYang : YaoState.YoungYang);
            }

            const result: { accountId?: string; status: number } = { status: ternaryStatus };
            if (this.accountId) {
                result.accountId = this.accountId;
            }
            return { ok: true, value: result };
        } catch (error) {
            logger.error({ error }, 'Cloudflare ability audit failed');
            return { ok: false, error: error as Error };
        }
    }

    async verifyToken(): Promise<Result<void>> {
        if (!this.apiToken) return { ok: false, error: new Error('No API Token provided') };

        try {
            // 1. Attempt Bearer Token against Core API
            const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            let bearerError = 'Bearer Auth Failed';

            if (response.ok) {
                const data = await response.json() as any;
                if (data.success && data.result.status === 'active') {
                    return { ok: true, value: undefined };
                }
                bearerError = data.errors?.[0]?.message || 'Invalid Token Status';
            } else {
                bearerError = `HTTP ${response.status}`;
            }

            // 2. Fallback: Global Key
            if (this.authEmail) {
                const globalResponse = await fetch('https://api.cloudflare.com/client/v4/user', {
                    method: 'GET',
                    headers: {
                        'X-Auth-Email': this.authEmail,
                        'X-Auth-Key': this.apiToken,
                        'Content-Type': 'application/json'
                    }
                });

                if (globalResponse.ok) {
                    const gData = await globalResponse.json() as any;
                    if (gData.success) {
                        this.useGlobalKey = true;
                        return { ok: true, value: undefined };
                    }
                }
            }

            // 3. Gateway Token Bypass
            // If we have a Gateway URL, the token might be a Gateway-Scoped token (not a Global User token).
            // In this case, standard verification fails, but the Gateway request might succeed.
            if (this.config.gatewayUrl) {
                logger.warn('Standard auth failed, but Gateway URL is present. Assuming Gateway-Scoped Token and proceeding.');
                return { ok: true, value: undefined };
            }

            return { ok: false, error: new Error(`Authentication failed. Bearer error: "${bearerError}". Global Key fallback also failed.`) };
        } catch (e) {
            return { ok: false, error: e as Error };
        }
    }

    private useGlobalKey: boolean = false;

    private getHeaders(contentType: string = 'application/json'): Record<string, string> {
        if (this.useGlobalKey && this.authEmail && this.apiToken) {
            return {
                'X-Auth-Email': this.authEmail,
                'X-Auth-Key': this.apiToken,
                'Content-Type': contentType
            };
        }
        return {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': contentType
        };
    }

    /**
     * Run a Workers AI model with ternary prioritization logic
     */
    async runAi<T = any>(model: string, input: any): Promise<Result<T>> {
        // Ternary Decision Pathing
        // 1:  Local Binding (Priority)
        // 0:  Gateway (Middle)
        // -1: Direct API (Fallback)

        const routingPreference = this.config.bindingUrl ? 1 : (this.config.gatewayUrl ? 0 : -1);
        logger.debug({ model, routingPreference }, 'Cloudflare AI routing decision');

        // Pin Routing Hex Card (Line 5: Authority)
        if (this.hexagramManager) {
            const stateMap: Record<number, YaoState> = {
                1: YaoState.OldYang,   // Moving towards edge
                0: YaoState.YoungYang, // Balanced
                [-1]: YaoState.YoungYin // Low resource/fallback
            };
            void this.hexagramManager.pinCard(5, 'Cognitive Routing',
                `Routed to ${routingPreference === 1 ? 'Local Proxy' : (routingPreference === 0 ? 'Gateway' : 'Direct API')}`,
                stateMap[routingPreference] || YaoState.YoungYang);
        }

        // Execute 1: Local Binding Proxy
        if (routingPreference === 1) {
            try {
                // Post to local worker: { model, input }
                const response = await fetch(`${this.config.bindingUrl}/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, input })
                });

                if (!response.ok) {
                    const text = await response.text();
                    logger.warn({ status: response.status, error: text }, 'Local Binding failed, dropping to Binary Fallback (Gateway/Direct)');
                    // Drop to cascade if local fails
                } else {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        return { ok: true, value: await response.json() as T };
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    return { ok: true, value: Buffer.from(arrayBuffer) as unknown as T };
                }
            } catch (e) {
                logger.warn({ error: e }, 'Local Binding network error, dropping to Binary Fallback');
            }
        }

        if (!this.accountId || !this.apiToken) {
            return { ok: false, error: new Error('Cloudflare credentials missing') };
        }

        const directUrl = `${this.baseUrl}/${this.accountId}/ai/run/${model}`;
        let gatewayUrl: string | undefined;

        // Gateway Injection
        if (this.config.gatewayUrl) {
            // Heuristic: strip '/compat' if present to find root gateway base
            const gatewayBase = this.config.gatewayUrl.replace(/\/compat\/?$/, '');
            // Construct Workers AI path: {gatewayBase}/workers-ai/{model}
            gatewayUrl = `${gatewayBase}/workers-ai/${model}`;
            logger.debug({ gatewayUrl }, 'Using Cloudflare AI Gateway URL');
        }

        // Attempt Gateway First
        if (gatewayUrl) {
            try {
                const response = await fetch(gatewayUrl, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(input)
                });

                if (response.ok) {
                    const contentType = response.headers.get('content-type');
                    if (contentType?.includes('application/json')) {
                        const data = await response.json() as any;
                        // Gateway results are typically wrapped in { result: T } if using AI Gateway
                        return { ok: true, value: (data.result !== undefined ? data.result : data) as T };
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    return { ok: true, value: Buffer.from(arrayBuffer) as unknown as T };
                } else {
                    const errText = await response.text();
                    logger.warn({
                        status: response.status,
                        error: errText,
                        url: gatewayUrl
                    }, 'Gateway request failed, falling back to Direct API');
                }
            } catch (gwError) {
                logger.warn({ error: (gwError as Error).message, url: gatewayUrl }, 'Gateway network error, falling back to Direct API');
            }
        }

        // Fallback / Direct API
        try {
            const response = await fetch(directUrl, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(input)
            });

            if (!response.ok) {
                const text = await response.text();
                return { ok: false, error: new Error(`AI Run failed: ${response.status} - ${text}`) };
            }

            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                const data = await response.json() as any;
                // Direct API result format might be wrapped in { result: T, success: boolean }
                // OR it might be direct result depending on endpoint.
                // Workers AI REST API returns { result: ..., success: true }
                if (data.success !== undefined && !data.success) {
                    return { ok: false, error: new Error(data.errors?.[0]?.message || 'AI Execution failed') };
                }

                // If data has result property, return it.
                if (data.result) return { ok: true, value: data.result as T };

                return { ok: true, value: data as T };
            }

            const arrayBuffer = await response.arrayBuffer();
            return { ok: true, value: Buffer.from(arrayBuffer) as unknown as T };

        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Run a logic component via GhostLimb (Substrate) pattern
     */
    async runGhostLimb<T = any>(_name: string, _args: any): Promise<Result<T>> {
        // Implementation for calling a specialized worker scripting logic
        // For CLI, this might map to a specific worker script deployment
        return { ok: false, error: new Error('GhostLimb execution not yet implemented in direct CLI mode') };
    }

    /**
     * Edge Bake - Procedural generation via Workers AI
     */
    async edgeBake(prompt: string, type: 'style' | 'markup' | 'logic'): Promise<Result<string>> {
        const systemPrompt = `You are a high-performance edge generator. Generate only the ${type} asked for. No markdown fences.`;
        return this.runAi<string>('@cf/meta/llama-3-8b-instruct', {
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ]
        });
    }

    // R2 Object Storage Methods - Using Shell-Ops for robustness (Dominant Decision)
    async putObject(bucket: string, key: string, data: string | Buffer, contentType?: string): Promise<Result<void>> {
        try {
            const contentTypeFlag = contentType ? ` --content-type "${contentType}"` : '';
            // Dominant Decision: Use shell execution to bypass project scope .env conflicts
            // Pattern: wrangler --global pattern (SovereignShell fallback style)
            const command = `wrangler r2 object put ${bucket}/${key}${contentTypeFlag} --file -`;

            logger.info({ bucket, key, command }, 'Executing Dominant Shell-Op for R2');

            // Note: In a real POG setup, we use execSync with specific env or child_process for --global effect
            execSync(command, { input: data, stdio: 'pipe' });

            // Pin Storage Hex Card (Line 6: Culmination)
            if (this.hexagramManager) {
                void this.hexagramManager.pinCard(6, 'R2 Storage Update', `Stored ${key} in ${bucket}`, YaoState.YoungYang);
            }

            return { ok: true, value: undefined };
        } catch (e) {
            logger.error({ error: e }, 'Cloudflare R2 Shell-Op failed');
            if (this.hexagramManager) {
                void this.hexagramManager.pinCard(6, 'R2 Storage Failure', `Failed to store ${key}`, YaoState.OldYin);
            }
            return { ok: false, error: e as Error };
        }
    }

    async getObject(bucket: string, key: string): Promise<Result<string>> {
        try {
            const command = `wrangler r2 object get ${bucket}/${key}`;
            logger.info({ bucket, key, command }, 'Executing Dominant Shell-Op for R2');
            const output = execSync(command).toString();

            if (this.hexagramManager) {
                void this.hexagramManager.pinCard(6, 'R2 Storage Retrieval', `Retrieved ${key} from ${bucket}`, YaoState.YoungYang);
            }

            return { ok: true, value: output };
        } catch (e) {
            logger.error({ error: e }, 'Cloudflare R2 Shell-Op failed');
            if (this.hexagramManager) {
                void this.hexagramManager.pinCard(6, 'R2 Storage Retrieval Failure', `Failed to get ${key}`, YaoState.OldYin);
            }
            return { ok: false, error: e as Error };
        }
    }
}
