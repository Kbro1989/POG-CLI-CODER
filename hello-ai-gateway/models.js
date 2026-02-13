
const CLOUDFLARE_MODELS = {
    text_generation: [
        "@cf/meta/llama-3.1-8b-instruct",
        "@cf/meta/llama-3.1-70b-instruct",
        "@cf/meta/llama-3.1-8b-instruct-fp8",
        "@cf/meta/llama-3.1-8b-instruct-awq",
        "@cf/meta/llama-3.2-1b-instruct",
        "@cf/meta/llama-3.2-3b-instruct",
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        "@cf/meta/llama-3-8b-instruct",
        "@cf/meta/llama-3-8b-instruct-awq",
        "@cf/meta/llama-2-7b-chat-fp16",
        "@cf/meta/llama-2-7b-chat-int8",
        "@cf/meta/llama-guard-3-8b",
        "@cf/google/gemma-7b-it",
        "@cf/google/gemma-7b-it-lora",
        "@cf/google/gemma-2b-it-lora",
        "@cf/google/gemma-3-12b-it",
        "@cf/mistral/mistral-7b-instruct-v0.1",
        "@cf/mistral/mistral-7b-instruct-v0.2",
        "@cf/mistral/mistral-small-3.1-24b-instruct",
        "@cf/qwen/qwen1.5-0.5b-chat",
        "@cf/qwen/qwen1.5-1.8b-chat",
        "@cf/qwen/qwen1.5-7b-chat-awq",
        "@cf/qwen/qwen1.5-14b-chat-awq",
        "@cf/qwen/qwen2.5-coder-32b-instruct",
        "@cf/qwen/qwen3-30b-a3b-fp8",
        "@cf/qwen/qwq-32b",
        "@cf/deepseek-ai/deepseek-math-7b-instruct",
        "@cf/deepseek-ai/deepseek-coder-6.7b-base-awq",
        "@cf/deepseek-ai/deepseek-coder-6.7b-instruct-awq",
        "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
        "@cf/microsoft/phi-2",
        "@cf/openchat/openchat-3.5-0106",
        "@cf/tinyllama/tinyllama-1.1b-chat-v1.0",
        "@cf/thebloke/discolm-german-7b-v1-awq",
        "@cf/tiiuae/falcon-7b-instruct",
        "@cf/defog/sqlcoder-7b-2",
        "@cf/fblgit/una-cybertron-7b-v2-bf16",
        "@cf/nexusflow/starling-lm-7b-beta",
        "@cf/nousresearch/hermes-2-pro-mistral-7b",
        "@cf/ibm/granite-4.0-h-micro",
        "@cf/openai/gpt-oss-20b",
        "@cf/openai/gpt-oss-120b",
        "@cf/isingapore/gemma-sea-lion-v4-27b-it",
    ],
    image_generation: [
        "@cf/black-forest-labs/flux-1-schnell",
        "@cf/black-forest-labs/flux-2-dev",
        "@cf/black-forest-labs/flux-2-klein-4b",
        "@cf/black-forest-labs/flux-2-klein-9b",
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        "@cf/bytedance/stable-diffusion-xl-lightning",
        "@cf/lykon/dreamshaper-8-lcm",
        "@cf/runwayml/stable-diffusion-v1-5-img2img",
        "@cf/runwayml/stable-diffusion-v1-5-inpainting",
        "@cf/leonardo/phoenix-1.0",
        "@cf/leonardo/lucid-origin",
    ],
    text_to_speech: [
        "@cf/deepgram/aura-1",
        "@cf/deepgram/aura-2-en",
        "@cf/deepgram/aura-2-es",
        "@cf/myshell-ai/melotts",
    ],
    speech_recognition: [
        "@cf/openai/whisper",
        "@cf/openai/whisper-tiny-en",
        "@cf/openai/whisper-large-v3-turbo",
        "@cf/deepgram/nova-3",
        "@cf/deepgram/flux",
    ],
    embeddings: [
        "@cf/baai/bge-small-en-v1.5",
        "@cf/baai/bge-base-en-v1.5",
        "@cf/baai/bge-large-en-v1.5",
        "@cf/baai/bge-m3",
        "@cf/google/embeddinggemma-300m",
        "@cf/qwen/qwen3-embedding-0.6b",
        "@cf/pfnet/plamo-embedding-1b",
    ],
    image_to_text: [
        "@cf/llava-hf/llava-1.5-7b-hf",
        "@cf/unum/uform-gen2-qwen-500m",
        "@cf/meta/llama-3.2-11b-vision-instruct",
    ],
    object_detection: [
        "@cf/facebook/detr-resnet-50",
    ],
    image_classification: [
        "@cf/microsoft/resnet-50",
    ],
    text_classification: [
        "@cf/huggingface/distilbert-sst-2-int8",
        "@cf/baai/bge-reranker-base",
    ],
    translation: [
        "@cf/meta/m2m100-1.2b",
        "@cf/ai4bharat/indictrans2-en-indic-1B",
    ],
    summarization: [
        "@cf/facebook/bart-large-cnn",
    ],
};

// Helper to check if a model ID is valid
function isValidModel(modelId) {
    return Object.values(CLOUDFLARE_MODELS).flat().includes(modelId);
}

// Helper to get capabilities for a model
function getModelCapabilities(modelId) {
    const caps = [];
    for (const [category, models] of Object.entries(CLOUDFLARE_MODELS)) {
        if (models.includes(modelId)) {
            caps.push(category);
        }
    }
    return caps;
}

module.exports = {
    CLOUDFLARE_MODELS,
    isValidModel,
    getModelCapabilities
};
