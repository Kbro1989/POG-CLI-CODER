
interface Env {
    AI: any;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Simple CORS
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers });
        }

        if (request.method === 'POST' && url.pathname === '/run') {
            try {
                const body = await request.json() as any;
                const { model, input } = body;

                if (!model || !input) {
                    return new Response('Missing model or input', { status: 400, headers });
                }

                // Execute via AI Binding
                const result = await env.AI.run(model, input);

                // Handle Response Types
                if (result instanceof ReadableStream) {
                    // Likely an image or stream
                    return new Response(result, { headers: { ...headers, 'content-type': 'image/png' } });
                }

                return new Response(JSON.stringify(result), { headers: { ...headers, 'content-type': 'application/json' } });

            } catch (e: any) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
            }
        }
        return new Response('Not Found', { status: 404, headers });
    }
};
