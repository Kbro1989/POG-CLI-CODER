
export interface RateLimitResult {
    allowed: boolean;
    message?: string;
    count?: number;
    limit?: number;
    window?: number;
    firstRequestTime?: number;
}

interface RateLimitState {
    count: number;
    firstRequestTime: number;
}

export class RateLimiter implements DurableObject {
    private state: DurableObjectState;

    constructor(state: DurableObjectState, env: any) {
        this.state = state;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const key = url.pathname.slice(1); // Remove leading slash
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const windowMs = parseInt(url.searchParams.get('window') || '60000');

        let data = (await this.state.storage.get<RateLimitState>(key)) || { count: 0, firstRequestTime: Date.now() };

        const now = Date.now();
        if (now - data.firstRequestTime > windowMs) {
            data = { count: 1, firstRequestTime: now };
        } else {
            data.count++;
        }

        const allowed = data.count <= limit;

        // Only write if changed (optimization)
        await this.state.storage.put(key, data);

        const result: RateLimitResult = {
            allowed,
            message: allowed ? 'OK' : 'Rate limit exceeded',
            count: data.count,
            limit,
            window: windowMs,
            firstRequestTime: data.firstRequestTime
        };

        return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
