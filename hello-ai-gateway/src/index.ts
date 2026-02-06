
export interface Env {
    AI: any;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method !== "POST") {
            return new Response("Please use POST", { status: 405 });
        }

        try {
            const { model, messages, stream } = await request.json() as any;

            if (!model || !messages) {
                return new Response("Missing model or messages", { status: 400 });
            }

            // Default to llama-3.1-8b if not specified
            const modelId = model || "@cf/meta/llama-3.1-8b-instruct";

            const response = await env.AI.run(modelId, {
                messages,
                stream: !!stream
            });

            if (stream) {
                return new Response(response, {
                    headers: { "content-type": "text/event-stream" }
                });
            }

            return new Response(JSON.stringify(response), {
                headers: { "content-type": "application/json" }
            });
        } catch (err: any) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "content-type": "application/json" }
            });
        }
    }
};
