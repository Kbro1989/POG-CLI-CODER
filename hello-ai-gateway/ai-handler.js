
const { isValidModel } = require('./models.js');

async function handleAI(request, env) {
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    try {
        const body = await request.json();
        const { model, messages, stream } = body;

        // Default to a robust model if none specified
        let modelId = model || "@cf/meta/llama-3.1-8b-instruct";

        // Validate Model ID (Optional but recommended)
        if (model && !isValidModel(model)) {
            console.warn(`[Gateway] Warning: Unknown model ID '${model}'. Cloudflare might reject this.`);
        }

        // Normalize Model ID
        if (modelId.startsWith("workers-ai/")) {
            modelId = modelId.replace("workers-ai/", "");
        }

        console.log(`[Gateway] Running model: ${modelId}, Stream: ${stream}`);
        console.log(`[Gateway] Gateway ID: ${env.AI_GATEWAY_ID || 'Not Set'}`);

        // AUTOMATIC PAYLOAD HANDLING
        const { model: _, ...inputs } = body;

        // Fallback for simple "chat" usage
        if (!inputs.messages && !inputs.prompt && !inputs.text && !inputs.image) {
            if (messages) inputs.messages = messages; // Restore if it was there
        }

        const options = {};
        if (env.AI_GATEWAY_ID) {
            options.gateway = {
                id: env.AI_GATEWAY_ID,
                skipCache: false
            };
        }

        let response;
        try {
            response = await env.AI.run(modelId, inputs, options);
        } catch (gatewayError) {
            console.warn(`[Gateway] Failed with Gateway options: ${gatewayError.message}. Retrying without Gateway...`);
            try {
                response = await env.AI.run(modelId, inputs);
            } catch (retryError) {
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

    } catch (err) {
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

module.exports = { handleAI };
