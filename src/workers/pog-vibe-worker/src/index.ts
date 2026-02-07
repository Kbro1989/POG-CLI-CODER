
import { RateLimiter } from './RateLimiter';

export interface Env {
    AI: any;
    RATE_LIMITER: DurableObjectNamespace;
}

export { RateLimiter };

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // 1. Rate Limiting (Global Protection)
        // We limit based on the route path (e.g., 'generate-image' bucket)
        const rateLimitId = env.RATE_LIMITER.idFromName(url.pathname);
        const rateLimiter = env.RATE_LIMITER.get(rateLimitId);

        // Default: 10 requests per minute
        const limitResponse = await rateLimiter.fetch(`http://limiter/${url.pathname}?limit=10&window=60000`);
        const limitResult = await limitResponse.json() as any;

        if (!limitResult.allowed) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Route Handling
        try {
            // Health Check / Root Handler
            if (request.method === 'GET' && url.pathname === '/') {
                return new Response(JSON.stringify({
                    service: 'Cloudflare Limb Substrate',
                    status: 'operational',
                    routes: ['/ai/image', '/ai/chat']
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Image Generation Route
            if (request.method === 'POST' && (url.pathname === '/ai/image' || url.pathname === '/generate-image')) {
                const body = await request.json() as { prompt: string };

                // Using Stable Diffusion XL (Flux logic can be swapped here if bindings allow)
                const response = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
                    prompt: body.prompt
                });

                return new Response(response, { headers: { 'Content-Type': 'image/png' } });
            }

            // Chat Completion Route
            if (request.method === 'POST' && (url.pathname === '/ai/chat' || url.pathname === '/chat')) {
                const body = await request.json() as { messages: any[] };

                // Using Llama 3.1
                const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
                    messages: body.messages
                });

                return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
            }

            return new Response('Not Found', { status: 404 });

        } catch (err) {
            return new Response(JSON.stringify({ error: (err as Error).message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }
};
