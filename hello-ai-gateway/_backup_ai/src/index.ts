import { isValidModel } from './models';

export interface Env {
    AI: any;
    AI_GATEWAY_ID: string;
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            const body = await request.json() as any;
            const { model, messages, stream } = body;

            // Default to a robust model if none specified
            let modelId = model || "@cf/meta/llama-3.1-8b-instruct";

            // If a short name is provided, you could add a mapping logic here. 
            // For now, we assume full ID or rely on client to send correct ID.

            // Validate Model ID (Optional but recommended)
            if (model && !isValidModel(model)) {
                console.warn(`[Gateway] Warning: Unknown model ID '${model}'. Cloudflare might reject this.`);
            }

            // Normalize Model ID
            // Clients using the generic OpenAI Gateway format might send "workers-ai/@cf/..."
            if (modelId.startsWith("workers-ai/")) {
                modelId = modelId.replace("workers-ai/", "");
            }

            console.log(`[Gateway] Running model: ${modelId}, Stream: ${stream}`);
            console.log(`[Gateway] Gateway ID: ${env.AI_GATEWAY_ID || 'Not Set'}`);

            // For non-text-generation tasks (like image gen), the input parameters differ.
            // This basic gateway assumes text-generation format (messages). 
            // We should detect capability or just pass 'body' through for flexibility?
            // "env.AI.run" arguments depend on the model type.

            // AUTOMATIC PAYLOAD HANDLING
            // If the user sends a raw payload that matches the model's expectation, we should pass it.
            // But we extracted { messages } which is specific to text-gen.

            // FIX: Pass the WHOLE body minus the 'model' field to allow flexibility for Image Gen / ASR etc.
            const { model: _, ...inputs } = body;

            // Fallback for simple "chat" usage
            if (!inputs.messages && !inputs.prompt && !inputs.text && !inputs.image) {
                if (messages) inputs.messages = messages; // Restore if it was there
            }

            const options: any = {};
            if (env.AI_GATEWAY_ID) {
                options.gateway = {
                    id: env.AI_GATEWAY_ID,
                    skipCache: false
                };
            }

            let response;
            try {
                response = await env.AI.run(modelId, inputs, options);
            } catch (gatewayError: any) {
                console.warn(`[Gateway] Failed with Gateway options: ${gatewayError.message}. Retrying without Gateway...`);
                // Fallback: Run without gateway options if the first attempt fails
                // This ensures robustness in local dev or if gateway is misconfigured
                try {
                    response = await env.AI.run(modelId, inputs);
                } catch (retryError: any) {
                    // If it fails again, it's a model/input issue, not gateway.
                    throw retryError;
                }
            }

            if (stream) {
                return new Response(response, {
                    headers: { "content-type": "text/event-stream" }
                });
            }

            return new Response(JSON.stringify(response), {
                headers: { "content-type": "application/json" }
            });

        } catch (err: any) {
            console.error("[Gateway] Error:", err);
            return new Response(JSON.stringify({
                error: err.message,
                hint: "Ensure the model ID and input format are correct."
            }), {
                status: 500,
                headers: { "content-type": "application/json" }
            });
        }
    }
};
