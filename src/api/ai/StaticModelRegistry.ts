import { AICapability, AITaskType } from './CapabilityRegistry.js';

export const CatalogMetadata = {
    tasks: {
        "Image classification": 27,
        "Object detection": 28,
        "Text classification": 54,
        "Entity extraction": 41,
        "Image segmentation": 10,
        "Image generation": 36,
        "Text generation": 84,
        "Image understanding": 27,
        "Text embeddings": 23,
        "Tabular classification": 13,
        "Document processing": 13,
        "Translation": 40,
        "Image retrieval": 2,
        "Video classification": 2,
        "Open vocabulary detection": 3,
        "Open vocabulary segmentation": 2,
        "Radiology": 3,
        "Health & Life Sciences": 8,
        "Video generation": 15,
        "Multimodal generation": 24,
        "Pathology": 3,
        "Dermatology": 3,
        "Audio generation": 11,
        "Text-to-speech": 3,
        "Multimodal embeddings": 5,
        "Speech recognition": 2,
        "Video understanding": 1,
        "Geospatial": 3
    } as Record<string, number>,
    providers: {
        "Google": 123,
        "Salesforce": 3,
        "Meta": 22,
        "Stability.ai": 4,
        "Mistral AI": 9,
        "Anthropic": 7,
        "AI21": 1,
        "CSM": 1,
        "Qodo": 1,
        "CAMB.AI": 1,
        "Virtue AI": 1,
        "Contextual AI": 1,
        "Mongodb": 5,
        "Writer": 1,
        "NVIDIA": 3,
        "Ai2": 1,
        "Open source": 143,
        "Notebook support": 144,
        "API available": 5,
        "Pipeline support": 3,
        "One-click deployment": 108,
        "Vertex AI Studio": 37,
        "Deploy on GKE": 20,
        "Demo available": 26
    } as Record<string, number>
};

export const StaticModelRegistry: Record<string, AICapability> = {
    // --- GOLD STANDARD TERNARY TIERS ---
    'gold_gemini_2_5_pro': {
        id: 'gold_gemini_2_5_pro',
        name: 'Sovereign Core (Local)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:14b-instruct-q5_K_M',
        description: 'PRIMARY REASONING: Local 14B planning and architectural core.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_7b'
    },
    'gold_gemini_2_5_flash': {
        id: 'gold_gemini_2_5_flash',
        name: 'Sovereign Sprint (Local)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        description: 'ULTRA FAST REASONING: Local 7B sprint intelligence.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_1_5b'
    },
    'gold_cloudflare_llama_3_1': {
        id: 'gold_cloudflare_llama_3_1',
        name: 'Sovereign Edge (Local)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama3.2:3b-instruct-q4_K_M',
        description: 'UTILITY TIER: Local 3B edge logic.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_1_5b'
    },
    'gold_huggingface_mistral': {
        id: 'gold_huggingface_mistral',
        name: 'Sovereign Niche (Local)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mistral:7b-instruct-v0.3-q4_K_M',
        description: 'NICHE TIER: Local Mistral for specialized NLP.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_7b'
    },
    'gold_sovereign_master': {
        id: 'gold_sovereign_master',
        name: 'Sovereign Master (Local DeepSeek)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-coder:33b-instruct-q4_K_M',
        description: 'LOCAL MASTER: 19GB 33B local coder for peak sovereign reasoning.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_14b'
    },
    'gold_qwen_2_5_coder_14b': {
        id: 'gold_qwen_2_5_coder_14b',
        name: 'Qwen 2.5 Coder 14B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:14b-instruct-q5_K_M',
        description: 'LOCAL TIER: High-powered on-device planning core.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_7b'
    },
    'gold_qwen_2_5_coder_7b': {
        id: 'gold_qwen_2_5_coder_7b',
        name: 'Qwen 2.5 Coder 7B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        description: 'LOCAL TIER: Primary on-device coding and logic.',
        passthroughEnabled: true,
        fallback: 'gold_deepseek_coder_6_7b'
    },
    'gold_yi_coder_9b': {
        id: 'gold_yi_coder_9b',
        name: 'Yi-Coder 9B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'yi-coder:9b-chat-q5_K_M',
        description: 'LOCAL TIER: Balanced local chat and snapshotting.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_7b'
    },
    'gold_deepseek_coder_6_7b': {
        id: 'gold_deepseek_coder_6_7b',
        name: 'DeepSeek Coder 6.7B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-coder:6.7b-instruct-q4_K_M',
        description: 'LOCAL TIER: High-fidelity code critique and validation.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_7b'
    },
    'side_tinyllama_latest': {
        id: 'side_tinyllama_latest',
        name: 'TinyLlama 1.1B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'tinyllama:latest',
        description: 'SIDE TIER: Ultra-fast local monitoring and intent classification.',
        passthroughEnabled: true
    },
    'side_qwen_2_5_coder_1_5b': {
        id: 'side_qwen_2_5_coder_1_5b',
        name: 'Qwen 2.5 Coder 1.5B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:1.5b-instruct-q4_K_M',
        description: 'SIDE TIER: Fast local intervention and small code tasks.',
        passthroughEnabled: true
    },
    'gold_ollama_sovereign_admin': {
        id: 'gold_ollama_sovereign_admin',
        name: 'Sovereign Admin (Local Qwen)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:14b-instruct-q5_K_M',
        description: 'LOCAL ADMIN: Local thinking substrate for strategic oversight.',
        passthroughEnabled: true,
        fallback: 'gold_qwen_2_5_coder_7b'
    },
    'gold_ollama_flux': {
        id: 'gold_ollama_flux',
        name: 'Flux (Local Creative)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'flux',
        description: 'LOCAL CREATIVE: High-fidelity image generation for sovereign creative ops.',
        passthroughEnabled: true
    },
    'gold_ollama_llava': {
        id: 'gold_ollama_llava',
        name: 'LLava (Local Vision)',
        serviceType: 'OLLAMA',
        taskType: 'VISION' as AITaskType,
        modelId: 'llava:v1.6-7b',
        description: 'LOCAL VISION: Multimodal analysis for image-to-text and UI audit.',
        passthroughEnabled: true
    },
    'gold_ollama_z_image': {
        id: 'gold_ollama_z_image',
        name: 'Z-Image-Turbo (Local Creative)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'x/z-image-turbo',
        description: 'LOCAL CREATIVE: Photorealistic local image generation.',
        passthroughEnabled: true
    },
    'gold_ollama_flux_klein': {
        id: 'gold_ollama_flux_klein',
        name: 'Flux.2 Klein (Local Creative)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'x/flux2-klein:4b-fp8',
        description: 'LOCAL CREATIVE: High-fidelity image and text generation.',
        passthroughEnabled: true
    },
    'gold_ollama_moondream': {
        id: 'gold_ollama_moondream',
        name: 'Moondream (Local Fast Vision)',
        serviceType: 'OLLAMA',
        taskType: 'VISION' as AITaskType,
        modelId: 'moondream:1.8b',
        description: 'LOCAL FAST VISION: Efficient lightweight multimodal analysis.',
        passthroughEnabled: true
    },
    'side_ollama_vibethinker': {
        id: 'side_ollama_vibethinker',
        name: 'VibeThinker 1.5B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'vibethinker:1.5b-q5_K_M',
        description: 'SIDE TIER: Rapid follower brain for real-time interaction and instant reactions.',
        passthroughEnabled: true
    },

    // --- DYNAMIC DISCOVERY ---
    'dynamic_gemini_3_flash_preview': {
        id: 'dynamic_gemini_3_flash_preview',
        name: 'Sovereign Flash (Local)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        description: 'LOCAL FLASH: Fast on-device reasoning.',
        passthroughEnabled: true
    },
    'dynamic_gemini_20_flash': {
        id: 'dynamic_gemini_20_flash',
        name: 'Sovereign Workhorse (Local)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2.5-coder:7b-instruct-q4_K_M',
        description: 'LOCAL WORKHORSE: Daily local tasks.',
        passthroughEnabled: true
    },
    'dynamic_gemini_computer_use_preview': {
        id: 'dynamic_gemini_computer_use_preview',
        name: 'Gemini Computer Use Preview',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemini-computer-use-preview',
        description: 'Power agents capable of interacting with user interfaces (UIs), such as browsers and web applications',
        passthroughEnabled: true
    },
    'dynamic_gemini_25_flash_image_nano_banana': {
        id: 'dynamic_gemini_25_flash_image_nano_banana',
        name: 'Gemini 2.5 Flash Image (Nano Banana)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'gemini-2.5-flash-image-(nano-banana)',
        description: 'Our standard model upgraded for rapid creative workflows with image generation and conversational, multi-turn editing capabilities.',
        passthroughEnabled: true
    },
    'dynamic_gemini_25_flash_image_preview': {
        id: 'dynamic_gemini_25_flash_image_preview',
        name: 'Gemini 2.5 Flash Image Preview',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'gemini-2.5-flash-image-preview',
        description: 'Our standard model upgraded for rapid creative workflows with image generation and conversational, multi-turn editing capabilities.',
        passthroughEnabled: true
    },
    'dynamic_veo_31_fast_for_video_generation': {
        id: 'dynamic_veo_31_fast_for_video_generation',
        name: 'Veo 3.1 Fast for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3.1-fast-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_veo_31_for_video_generation': {
        id: 'dynamic_veo_31_for_video_generation',
        name: 'Veo 3.1 for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3.1-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_veo_31_for_video_generation_1': {
        id: 'dynamic_veo_31_for_video_generation_1',
        name: 'Veo 3.1 for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3.1-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_imagen_4_ultra_for_image_generation': {
        id: 'dynamic_imagen_4_ultra_for_image_generation',
        name: 'Sovereign Vision (Local)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'x/z-image-turbo',
        description: 'LOCAL CREATIVE: High-fidelity image generation.',
        passthroughEnabled: true
    },
    'dynamic_imagen_for_editing_and_customization': {
        id: 'dynamic_imagen_for_editing_and_customization',
        name: 'Imagen for Editing and Customization',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-for-editing-and-customization',
        description: 'Use text prompts to edit existing input images, or parts of an image with a mask or generate new images based upon the context provided by input reference images.',
        passthroughEnabled: true
    },
    'dynamic_veo_3_for_video_generation': {
        id: 'dynamic_veo_3_for_video_generation',
        name: 'Veo 3 for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_veo_3_fast_for_video_generation': {
        id: 'dynamic_veo_3_fast_for_video_generation',
        name: 'Veo 3 Fast for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3-fast-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_imagen_4_ultra_for_image_generation_substrate_v2': {
        id: 'dynamic_imagen_4_ultra_for_image_generation_substrate_v2',
        name: 'Imagen 4 Ultra for Image Generation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-4-ultra-for-image-generation',
        description: 'Use text prompts to generate novel images.',
        passthroughEnabled: true
    },
    'dynamic_imagen_4_fast_for_image_generation_1': {
        id: 'dynamic_imagen_4_fast_for_image_generation_1',
        name: 'Imagen 4 Fast for Image Generation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-4-fast-for-image-generation',
        description: 'Use text prompts to generate novel images.',
        passthroughEnabled: true
    },
    'dynamic_imagen_4_for_image_generation_1': {
        id: 'dynamic_imagen_4_for_image_generation_1',
        name: 'Imagen 4 for Image Generation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-4-for-image-generation',
        description: 'Use text prompts to generate novel images.',
        passthroughEnabled: true
    },
    'dynamic_veo_3_for_video_generation_1': {
        id: 'dynamic_veo_3_for_video_generation_1',
        name: 'Veo 3 for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_lyria_2_for_music_generation': {
        id: 'dynamic_lyria_2_for_music_generation',
        name: 'Lyria 2 for Music Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'lyria-2-for-music-generation',
        description: 'Lyria 2 is a latent text-to-audio diffusion model capable of generating high-quality instrumental music from text input.',
        passthroughEnabled: true
    },
    'dynamic_imagen_for_generation': {
        id: 'dynamic_imagen_for_generation',
        name: 'Imagen for Generation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-for-generation',
        description: 'Use text prompts to generate novel images.',
        passthroughEnabled: true
    },
    'dynamic_imagen_for_editing_and_customization_1': {
        id: 'dynamic_imagen_for_editing_and_customization_1',
        name: 'Imagen for Editing and Customization',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-for-editing-and-customization',
        description: 'Use text prompts to edit existing input images, or parts of an image with a mask or generate new images based upon the context provided by input reference images.',
        passthroughEnabled: true
    },
    'dynamic_imagen_2_for_generation_and_editing': {
        id: 'dynamic_imagen_2_for_generation_and_editing',
        name: 'Imagen 2 for Generation and Editing',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-2-for-generation-and-editing',
        description: 'Use text prompts to generative novel images, edit existing ones, edit parts of an image with a mask and more.',
        passthroughEnabled: true
    },
    'dynamic_claude_opus_45': {
        id: 'dynamic_claude_opus_45',
        name: 'Claude Opus 4.5',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-opus-4.5',
        description: 'Anthropic\'s most powerful model yet and the state-of-the-art coding model.',
        passthroughEnabled: true
    },
    'dynamic_claude_haiku_45': {
        id: 'dynamic_claude_haiku_45',
        name: 'Claude Haiku 4.5',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-haiku-4.5',
        description: 'The next generation of Anthropic\'s fastest and most cost-effective model, optimal for use cases where speed and affordability matter.',
        passthroughEnabled: true
    },
    'dynamic_claude_sonnet_45': {
        id: 'dynamic_claude_sonnet_45',
        name: 'Claude Sonnet 4.5',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-sonnet-4.5',
        description: 'Anthropic\'s industry-leading model for high-volume uses in coding, in-depth research, agents, & more.',
        passthroughEnabled: true
    },
    'dynamic_claude_opus_41': {
        id: 'dynamic_claude_opus_41',
        name: 'Claude Opus 4.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-opus-4.1',
        description: 'The next generation of Anthropicâ€™s most powerful model yet, Claude Opus 4.1 is an industry leader for coding. It delivers sustained performance on long-running tasks that require focused effort and thousands of steps, significantly expanding what AI agents can solve. Claude Opus 4.1 is ideal for powering frontier agent products and features.',
        passthroughEnabled: true
    },
    'dynamic_claude_opus_4': {
        id: 'dynamic_claude_opus_4',
        name: 'Claude Opus 4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-opus-4',
        description: 'Anthropicâ€™s most powerful model yet and the state-of-the-art coding model. It delivers sustained performance on long-running tasks that require focused effort and thousands of steps, significantly expanding what AI agents can solve. Claude Opus 4 is ideal for powering frontier agent products and features.',
        passthroughEnabled: true
    },
    'dynamic_claude_sonnet_4': {
        id: 'dynamic_claude_sonnet_4',
        name: 'Claude Sonnet 4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-sonnet-4',
        description: 'Anthropic\'s mid-size model with superior intelligence for high-volume uses in coding, in-depth research, agents, & more.',
        passthroughEnabled: true
    },
    'dynamic_claude_3_haiku': {
        id: 'dynamic_claude_3_haiku',
        name: 'Claude 3 Haiku',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'claude-3-haiku',
        description: 'Claude 3 Haiku is Anthropic\'s fastest vision and text model for near-instant responses to simple queries, meant for seamless AI experiences mimicking human interactions.',
        passthroughEnabled: true
    },
    'dynamic_functiongemma': {
        id: 'dynamic_functiongemma',
        name: 'FunctionGemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'functiongemma',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_embeddinggemma': {
        id: 'dynamic_embeddinggemma',
        name: 'EmbeddingGemma',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'embeddinggemma',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_gemma_3n': {
        id: 'dynamic_gemma_3n',
        name: 'Gemma 3n',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma-3n',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_medgemma': {
        id: 'dynamic_medgemma',
        name: 'MedGemma',
        serviceType: 'OLLAMA',
        taskType: 'HEALTH',
        modelId: 'medgemma',
        description: 'Collection of Gemma 3 variants that are trained for performance on medical text and image comprehension.',
        passthroughEnabled: true
    },
    'dynamic_gemma_3': {
        id: 'dynamic_gemma_3',
        name: 'Gemma 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma-3',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_shieldgemma_2': {
        id: 'dynamic_shieldgemma_2',
        name: 'ShieldGemma 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'shieldgemma-2',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_gemma_2': {
        id: 'dynamic_gemma_2',
        name: 'Gemma 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma-2',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_paligemma_1_2': {
        id: 'dynamic_paligemma_1_2',
        name: 'PaliGemma 1 & 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'paligemma-1-&-2',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_gemma': {
        id: 'dynamic_gemma',
        name: 'Gemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_codegemma': {
        id: 'dynamic_codegemma',
        name: 'CodeGemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'codegemma',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_llama_4_api_service': {
        id: 'dynamic_llama_4_api_service',
        name: 'Llama 4 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-4-api-service',
        description: 'Access Meta\'s Llama 4 models as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_llama_4': {
        id: 'dynamic_llama_4',
        name: 'Llama 4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-4',
        description: 'Explore and build with Llama 4 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_sesame_csm': {
        id: 'dynamic_sesame_csm',
        name: 'Sesame CSM',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'sesame-csm',
        description: 'Speech generation model that generates audio from text and audio inputs.',
        passthroughEnabled: true
    },
    'dynamic_llama_31': {
        id: 'dynamic_llama_31',
        name: 'Llama 3.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.1',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_llama_33': {
        id: 'dynamic_llama_33',
        name: 'Llama 3.3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.3',
        description: 'Explore and build with Llama 3.3 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_llama_32': {
        id: 'dynamic_llama_32',
        name: 'Llama 3.2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.2',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_llama_33_api_service': {
        id: 'dynamic_llama_33_api_service',
        name: 'Llama 3.3 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.3-api-service',
        description: 'Access Meta\'s Llama 3.3 models as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_llama_32_api_service': {
        id: 'dynamic_llama_32_api_service',
        name: 'Llama 3.2 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.2-api-service',
        description: 'Access Meta\'s Llama 3.2 models as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_llama_3': {
        id: 'dynamic_llama_3',
        name: 'Llama 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_veo_2_for_generation': {
        id: 'dynamic_veo_2_for_generation',
        name: 'Veo 2 for Generation',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'veo-2-for-generation',
        description: 'Use text prompts to generate high-quality, realistic videos.',
        passthroughEnabled: true
    },
    'dynamic_llama_31_api_service': {
        id: 'dynamic_llama_31_api_service',
        name: 'Llama 3.1 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.1-api-service',
        description: 'Access Meta\'s Llama 3.1 models as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_llama_guard': {
        id: 'dynamic_llama_guard',
        name: 'Llama Guard',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-guard',
        description: 'Explore and build with Meta\'s Llama Guard models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_prompt_guard': {
        id: 'dynamic_prompt_guard',
        name: 'Prompt Guard',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'prompt-guard',
        description: 'Explore and build with Meta\'s Prompt Guard models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_llama_2': {
        id: 'dynamic_llama_2',
        name: 'Llama 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-2',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_codestral_2': {
        id: 'dynamic_codestral_2',
        name: 'Codestral 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'codestral-2',
        description: 'A cutting-edge model specifically designed for code generation, including fill-in-the-middle and code completion.',
        passthroughEnabled: true
    },
    'dynamic_mistral_medium_3': {
        id: 'dynamic_mistral_medium_3',
        name: 'Mistral Medium 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mistral-medium-3',
        description: 'Mistral Medium is an advanced Large Language Model (LLM) with state-of-the-art reasoning, knowledge and coding capabilities.',
        passthroughEnabled: true
    },
    'dynamic_mistral_ocr_2505': {
        id: 'dynamic_mistral_ocr_2505',
        name: 'Mistral OCR (25.05)',
        serviceType: 'DOCUMENT_AI',
        taskType: 'IMAGE',
        modelId: 'mistral-ocr-(25.05)',
        description: 'Fast and accurate model to convert documents to markdown with interleaved images and text',
        passthroughEnabled: true
    },
    'dynamic_codestral_2501_self-deploy': {
        id: 'dynamic_codestral_2501_self-deploy',
        name: 'Codestral (25.01) (Self-Deploy)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'codestral-(25.01)-(self-deploy)',
        description: 'A cutting-edge model specifically designed for code generation, including fill-in-the-middle and code completion.',
        passthroughEnabled: true
    },
    'dynamic_mistral_small_31_2503': {
        id: 'dynamic_mistral_small_31_2503',
        name: 'Mistral Small 3.1 (25.03)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mistral-small-3.1-(25.03)',
        description: 'Mistral Small 3.1 (25.03) is the enhanced version of Mistral Small 3, featuring multimodal capabilities and an extended context length of up to 128k.',
        passthroughEnabled: true
    },
    'dynamic_jamba_large_16': {
        id: 'dynamic_jamba_large_16',
        name: 'Jamba Large 1.6',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'jamba-large-1.6',
        description: 'Jamba Large 1.6 offers fast, high-quality performance with superior long context handling and speed.',
        passthroughEnabled: true
    },
    'dynamic_mars7': {
        id: 'dynamic_mars7',
        name: 'MARS7',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'mars7',
        description: 'Hyper-realistic text to speech in 10+ languages.',
        passthroughEnabled: true
    },
    'dynamic_mixtral': {
        id: 'dynamic_mixtral',
        name: 'Mixtral',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mixtral',
        description: 'A Mixture of Experts LLM series developed by Mistral AI.',
        passthroughEnabled: true
    },
    'dynamic_translategemma': {
        id: 'dynamic_translategemma',
        name: 'TranslateGemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'translategemma',
        description: 'A new family of open machine translation models based on the powerful Gemma 3 foundation.',
        passthroughEnabled: true
    },
    'dynamic_glm_47_api_service': {
        id: 'dynamic_glm_47_api_service',
        name: 'GLM 4.7 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'glm-4.7-api-service',
        description: 'Access the GLM 4.7 model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_nvidia_nemotron_v3': {
        id: 'dynamic_nvidia_nemotron_v3',
        name: 'NVIDIA Nemotron V3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'nvidia-nemotron-v3',
        description: 'Serve NVIDIA Nemotron V3 on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_medasr': {
        id: 'dynamic_medasr',
        name: 'MedASR',
        serviceType: 'OLLAMA',
        taskType: 'HEALTH',
        modelId: 'medasr',
        description: 'MedASR is an automatic speech recognition (ASR) model that has been trained for the medical domain.',
        passthroughEnabled: true
    },
    'dynamic_ministral_3': {
        id: 'dynamic_ministral_3',
        name: 'Ministral 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'ministral-3',
        description: 'State-of-the-art Ministral 3 family of models.',
        passthroughEnabled: true
    },
    'dynamic_mistral_large_3': {
        id: 'dynamic_mistral_large_3',
        name: 'Mistral Large 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mistral-large-3',
        description: 'General-purpose Multimodal granular Mixture-of-Experts model.',
        passthroughEnabled: true
    },
    'dynamic_deepseek_v32_api_service': {
        id: 'dynamic_deepseek_v32_api_service',
        name: 'DeepSeek V3.2 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-v3.2-api-service',
        description: 'Access the DeepSeek V3.2 model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_qwen3_embedding': {
        id: 'dynamic_qwen3_embedding',
        name: 'Qwen3 Embedding',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'qwen3-embedding',
        description: 'Converts text data into numerical vectors that capture the meaning and relationships between words and phrases.',
        passthroughEnabled: true
    },
    'dynamic_weathernext_2': {
        id: 'dynamic_weathernext_2',
        name: 'WeatherNext 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'weathernext-2',
        description: 'State-of-the-art AI weather forecasting. Fast, efficient, and more accurate than current medium-range systems.',
        passthroughEnabled: true
    },
    'dynamic_kimi_k2_thinking_api_service': {
        id: 'dynamic_kimi_k2_thinking_api_service',
        name: 'Kimi K2 Thinking API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'kimi-k2-thinking-api-service',
        description: 'Access the Kimi K2 Thinking model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_minimax-m2': {
        id: 'dynamic_minimax-m2',
        name: 'MiniMax-M2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'minimax-m2',
        description: 'Serve MiniMax-M2 on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_minimax-m2_api_service': {
        id: 'dynamic_minimax-m2_api_service',
        name: 'MiniMax-M2 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'minimax-m2-api-service',
        description: 'Access the MiniMax-M2 model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_deepseek_ocr_api_service': {
        id: 'dynamic_deepseek_ocr_api_service',
        name: 'DeepSeek OCR API Service',
        serviceType: 'DOCUMENT_AI',
        taskType: 'TEXT',
        modelId: 'deepseek-ocr-api-service',
        description: 'Access the DeepSeek OCR model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_deepseek-ocr': {
        id: 'dynamic_deepseek-ocr',
        name: 'DeepSeek-OCR',
        serviceType: 'DOCUMENT_AI',
        taskType: 'TEXT',
        modelId: 'deepseek-ocr',
        description: 'Serve with deepseek-ai/DeepSeek-OCR.',
        passthroughEnabled: true
    },
    'dynamic_nvidia_nemotron_nano_v2_12b_vl': {
        id: 'dynamic_nvidia_nemotron_nano_v2_12b_vl',
        name: 'NVIDIA Nemotron Nano v2 12B VL',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'nvidia-nemotron-nano-v2-12b-vl',
        description: 'An efficient 12B multimodal model for fast video and document understanding on text, video, and images.',
        passthroughEnabled: true
    },
    'dynamic_imagery_-_classification_and_retrieval_for_remote_sensing': {
        id: 'dynamic_imagery_-_classification_and_retrieval_for_remote_sensing',
        name: 'Imagery - Classification and Retrieval for Remote Sensing',
        serviceType: 'OLLAMA',
        taskType: 'GEO',
        modelId: 'imagery---classification-and-retrieval-for-remote-sensing',
        description: 'A vision-language model for zero-shot classification and retrieval of aerial and satellite images',
        passthroughEnabled: true
    },
    'dynamic_imagery_-_object_detection_for_remote_sensing': {
        id: 'dynamic_imagery_-_object_detection_for_remote_sensing',
        name: 'Imagery - Object Detection for Remote Sensing',
        serviceType: 'CLOUD_VISION',
        taskType: 'GEO',
        modelId: 'imagery---object-detection-for-remote-sensing',
        description: 'An open-vocabulary object detection model for aerial and satellite images',
        passthroughEnabled: true
    },
    'dynamic_palmyra_x4_self-deploy': {
        id: 'dynamic_palmyra_x4_self-deploy',
        name: 'Palmyra X4 (Self-Deploy)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'palmyra-x4-(self-deploy)',
        description: 'Top-ranked on Stanford HELM, WRITER\'s Palmyra X4 achieves superior performance on complex tasks and agentic workflows.',
        passthroughEnabled: true
    },
    'dynamic_deepseek-v32': {
        id: 'dynamic_deepseek-v32',
        name: 'DeepSeek-V3.2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-v3.2',
        description: 'Serve with deepseek-ai/deepseek-V3.2 models.',
        passthroughEnabled: true
    },
    'dynamic_veo_31_fast_for_video_generation_1': {
        id: 'dynamic_veo_31_fast_for_video_generation_1',
        name: 'Veo 3.1 Fast for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3.1-fast-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_qwen3-next': {
        id: 'dynamic_qwen3-next',
        name: 'Qwen3-Next',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3-next',
        description: 'Explore and build with Qwen3 Next models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_qwen3-next_instruct_api_service': {
        id: 'dynamic_qwen3-next_instruct_api_service',
        name: 'Qwen3-Next Instruct API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3-next-instruct-api-service',
        description: 'Access the Qwen3-Next Instruct model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_qwen3-next_thinking_api_service': {
        id: 'dynamic_qwen3-next_thinking_api_service',
        name: 'Qwen3-Next Thinking API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3-next-thinking-api-service',
        description: 'Access the Qwen3-Next Thinking model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_sea-lion_v4': {
        id: 'dynamic_sea-lion_v4',
        name: 'SEA-LION v4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'sea-lion-v4',
        description: 'A collection of Large Language Models pretrained and instruct-tuned for the Southeast Asia region.',
        passthroughEnabled: true
    },
    'dynamic_deepseek_v31_api_service': {
        id: 'dynamic_deepseek_v31_api_service',
        name: 'DeepSeek V3.1 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-v3.1-api-service',
        description: 'Access the DeepSeek V3.1 model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_deepseek-v31': {
        id: 'dynamic_deepseek-v31',
        name: 'DeepSeek-V3.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-v3.1',
        description: 'Serve with deepseek-ai/deepseek-V3.1 models.',
        passthroughEnabled: true
    },
    'dynamic_glm-45': {
        id: 'dynamic_glm-45',
        name: 'GLM-4.5',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'glm-4.5',
        description: 'Foundation models designed for intelligent agents',
        passthroughEnabled: true
    },
    'dynamic_wan_22': {
        id: 'dynamic_wan_22',
        name: 'Wan 2.2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'wan-2.2',
        description: 'Explore and build with Wan2.2 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_qwen-image': {
        id: 'dynamic_qwen-image',
        name: 'Qwen-Image',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'qwen-image',
        description: 'Qwen\'s image generation model for complex text rendering and precise image editing',
        passthroughEnabled: true
    },
    'dynamic_qwen3-vl': {
        id: 'dynamic_qwen3-vl',
        name: 'Qwen3-VL',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'qwen3-vl',
        description: 'Qwen\'s vision-language model with major improvements across multiple dimensions, including understanding and generating text, perceiving and reasoning about visual content, supporting longer context lengths, understanding spatial relationships and dynamic videos, and interacting with AI agents.',
        passthroughEnabled: true
    },
    'dynamic_gpt_oss_api_service': {
        id: 'dynamic_gpt_oss_api_service',
        name: 'GPT OSS API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gpt-oss-api-service',
        description: 'Access GPT OSS models as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_gpt_oss': {
        id: 'dynamic_gpt_oss',
        name: 'GPT OSS',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gpt-oss',
        description: 'OpenAI\'s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases',
        passthroughEnabled: true
    },
    'dynamic_qwen3-coder': {
        id: 'dynamic_qwen3-coder',
        name: 'Qwen3-Coder',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3-coder',
        description: 'Explore and build with Qwen3 Coder models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_qwen3_coder_api_service': {
        id: 'dynamic_qwen3_coder_api_service',
        name: 'Qwen3 Coder API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3-coder-api-service',
        description: 'Access Qwen3 Coder model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_qwen3_235b_instruct_api_service': {
        id: 'dynamic_qwen3_235b_instruct_api_service',
        name: 'Qwen3 235B Instruct API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3-235b-instruct-api-service',
        description: 'Access the Qwen3 235B Instruct model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_kimi-k2': {
        id: 'dynamic_kimi-k2',
        name: 'Kimi-K2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'kimi-k2',
        description: 'Explore and build with Kimi-K2 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_wan_21': {
        id: 'dynamic_wan_21',
        name: 'Wan 2.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'wan-2.1',
        description: 'Explore and build with Wan2.1 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_virtual_try-on': {
        id: 'dynamic_virtual_try-on',
        name: 'Virtual Try-On',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'virtual-try-on',
        description: 'Virtual Try-On is a fully managed Vertex AI service to generate images of persons modeling fashion products.',
        passthroughEnabled: true
    },
    'dynamic_t5gemma': {
        id: 'dynamic_t5gemma',
        name: 'T5Gemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 't5gemma',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_medsiglip': {
        id: 'dynamic_medsiglip',
        name: 'MedSigLIP',
        serviceType: 'OLLAMA',
        taskType: 'HEALTH',
        modelId: 'medsiglip',
        description: 'SigLIP variant that is trained to encode medical images and text into a common embedding space.',
        passthroughEnabled: true
    },
    'dynamic_bge': {
        id: 'dynamic_bge',
        name: 'BGE',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'bge',
        description: 'Serve with BAAI BGE series models.',
        passthroughEnabled: true
    },
    'dynamic_veo_3_fast_for_video_generation_1': {
        id: 'dynamic_veo_3_fast_for_video_generation_1',
        name: 'Veo 3 Fast for Video Generation',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'veo-3-fast-for-video-generation',
        description: 'Use text prompts or static image + text prompts to generate novel videos with audio.',
        passthroughEnabled: true
    },
    'dynamic_deepseek_r1_0528_api_service': {
        id: 'dynamic_deepseek_r1_0528_api_service',
        name: 'DeepSeek R1 0528 API Service',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-r1-0528-api-service',
        description: 'Access the DeepSeek R1 0528 model as a fully managed Vertex AI service',
        passthroughEnabled: true
    },
    'dynamic_imagen_product_recontext': {
        id: 'dynamic_imagen_product_recontext',
        name: 'Imagen Product Recontext',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-product-recontext',
        description: 'Product Recontext is a fully managed Vertex AI service to generate images of products in new scenes and contexts.',
        passthroughEnabled: true
    },
    'dynamic_chirp_3': {
        id: 'dynamic_chirp_3',
        name: 'Chirp 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'chirp-3',
        description: 'Chirp 3 is the latest generation of Google\'s multilingual ASR-specific generative models.',
        passthroughEnabled: true
    },
    'dynamic_gemini_embedding_001': {
        id: 'dynamic_gemini_embedding_001',
        name: 'Gemini Embedding 001',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'gemini-embedding-001',
        description: 'Converts text data into vector representations for semantic search, classification, clustering, and similar tasks.',
        passthroughEnabled: true
    },
    'dynamic_qwen3': {
        id: 'dynamic_qwen3',
        name: 'Qwen3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3',
        description: 'Explore and build with Qwen3 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_hidream-i1': {
        id: 'dynamic_hidream-i1',
        name: 'HiDream-I1',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'hidream-i1',
        description: '17B text-to-image model achieving image quality across diverse styles',
        passthroughEnabled: true
    },
    'dynamic_dia-16b': {
        id: 'dynamic_dia-16b',
        name: 'Dia-1.6B',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'dia-1.6b',
        description: 'Compact text-to-speech model generating realistic dialogue with emotion control.',
        passthroughEnabled: true
    },
    'dynamic_qwq': {
        id: 'dynamic_qwq',
        name: 'QwQ',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwq',
        description: 'Explore and build with QwQ models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_cogvideox-2b': {
        id: 'dynamic_cogvideox-2b',
        name: 'CogVideoX-2b',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'cogvideox-2b',
        description: 'Explore and build with CogVideoX-2b on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_txgemma': {
        id: 'dynamic_txgemma',
        name: 'TxGemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'txgemma',
        description: 'TxGemma generates predictions, classifications or text based on therapeutic related data and can be used to efficiently build AI models for therapeutic-related tasks with less data and less compute.',
        passthroughEnabled: true
    },
    'dynamic_hear': {
        id: 'dynamic_hear',
        name: 'HeAR',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'hear',
        description: 'HeAR produces embeddings based on audio clips of health-related sounds that can be used to efficiently train classifier models for health acoustic related tasks with less data and less compute.',
        passthroughEnabled: true
    },
    'dynamic_phi-4': {
        id: 'dynamic_phi-4',
        name: 'Phi-4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'phi-4',
        description: 'Explore and build with Phi-4 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_deepseek-r1': {
        id: 'dynamic_deepseek-r1',
        name: 'DeepSeek-R1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-r1',
        description: 'Serve with deepseek-ai/deepseek-r1 models.',
        passthroughEnabled: true
    },
    'dynamic_deepseek-v3': {
        id: 'dynamic_deepseek-v3',
        name: 'DeepSeek-V3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-v3',
        description: 'Serve with deepseek-ai/deepseek-v3 models.',
        passthroughEnabled: true
    },
    'dynamic_weathernext_demo': {
        id: 'dynamic_weathernext_demo',
        name: 'WeatherNext Demo',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'weathernext-demo',
        description: 'State-of-the-art weather forecasting, powered by AI. Fast, efficient, and more accurate than the best medium range systems in use today.',
        passthroughEnabled: true
    },
    'dynamic_nvidia_cosmos': {
        id: 'dynamic_nvidia_cosmos',
        name: 'Nvidia Cosmos',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'nvidia-cosmos',
        description: 'Nvidia Cosmos World Foundation Models',
        passthroughEnabled: true
    },
    'dynamic_path_foundation': {
        id: 'dynamic_path_foundation',
        name: 'Path Foundation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'path-foundation',
        description: 'Path Foundation produces embeddings that can be used to efficiently train classifier models for pathology analysis tasks on H&E patches from whole slide images with less data and less compute.',
        passthroughEnabled: true
    },
    'dynamic_derm_foundation': {
        id: 'dynamic_derm_foundation',
        name: 'Derm Foundation',
        serviceType: 'HEALTH_AI',
        taskType: 'TEXT',
        modelId: 'derm-foundation',
        description: 'Derm Foundation produces embeddings that can be used to efficiently train classifier models for dermatology-related tasks on photographs of human skin with less data and less compute.',
        passthroughEnabled: true
    },
    'dynamic_whisper_large': {
        id: 'dynamic_whisper_large',
        name: 'Whisper Large',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'whisper-large',
        description: 'Whisper Large is OpenAI\'s state-of-the-art model for automatic speech recognition (ASR).',
        passthroughEnabled: true
    },
    'dynamic_chirp_2': {
        id: 'dynamic_chirp_2',
        name: 'Chirp 2',
        serviceType: 'OLLAMA',
        taskType: 'AUDIO',
        modelId: 'chirp-2',
        description: 'Chirp 2 is a multilingual automatic speech recognition (ASR) model developed by Google that transcribes speech (Speech-to-Text).',
        passthroughEnabled: true
    },
    'dynamic_vertex_image_segmentation': {
        id: 'dynamic_vertex_image_segmentation',
        name: 'Vertex Image Segmentation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'vertex-image-segmentation',
        description: 'Segment images and generate masks with a fully managed Vertex AI service.',
        passthroughEnabled: true
    },
    'dynamic_flux': {
        id: 'dynamic_flux',
        name: 'Flux',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'flux',
        description: 'A low latency text-to-image generation model created by Black Forest Labs',
        passthroughEnabled: true
    },
    'dynamic_phi-3': {
        id: 'dynamic_phi-3',
        name: 'Phi-3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'phi-3',
        description: 'Explore and build with Phi-3 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_qwen2_qwen25': {
        id: 'dynamic_qwen2_qwen25',
        name: 'Qwen2 & Qwen2.5',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2-&-qwen2.5',
        description: 'Explore and build with Qwen2 and Qwen2.5 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_mammut': {
        id: 'dynamic_mammut',
        name: 'MaMMUT',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mammut',
        description: 'A simple vision-encoder and text-decoder architecture for multimodal tasks.',
        passthroughEnabled: true
    },
    'dynamic_e5_text_embedding': {
        id: 'dynamic_e5_text_embedding',
        name: 'E5 Text Embedding',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'e5-text-embedding',
        description: 'Converts text data into numerical vectors that capture the meaning and relationships between words and phrases.',
        passthroughEnabled: true
    },
    'dynamic_timesfm': {
        id: 'dynamic_timesfm',
        name: 'TimesFM',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'timesfm',
        description: 'TimesFM (Time Series Foundation Model) is a pretrained time-series foundation model developed by Google Research for univariate time-series forecasting.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_xl_lightning': {
        id: 'dynamic_stable_diffusion_xl_lightning',
        name: 'Stable Diffusion XL Lightning',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-xl-lightning',
        description: 'A low latency text-to-image generation model based on Stable Diffusion XL.',
        passthroughEnabled: true
    },
    'dynamic_instant_id': {
        id: 'dynamic_instant_id',
        name: 'Instant ID',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'instant-id',
        description: 'An identity-preserving text-to-image generation model.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_xl_lcm': {
        id: 'dynamic_stable_diffusion_xl_lcm',
        name: 'Stable Diffusion XL LCM',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-xl-lcm',
        description: 'A Latent Consistency Model for low latency text-to-image generation based on Stable Diffusion XL.',
        passthroughEnabled: true
    },
    'dynamic_llava_15_llava-next': {
        id: 'dynamic_llava_15_llava-next',
        name: 'LLaVA 1.5 & LLaVA-NeXT',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llava-1.5-&-llava-next',
        description: 'Deploy LLaVA 1.5 and LLaVA-NeXT on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_lama_large_mask_inpainting': {
        id: 'dynamic_lama_large_mask_inpainting',
        name: 'LaMa (Large Mask Inpainting)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'lama-(large-mask-inpainting)',
        description: 'Resolution-robust large mask inpainting with Fourier convolutions.',
        passthroughEnabled: true
    },
    'dynamic_vicuna': {
        id: 'dynamic_vicuna',
        name: 'Vicuna',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'vicuna',
        description: 'Vicuna is a LLM trained by fine-tuning Llama 2 on user-shared conversation from ShareGPT.',
        passthroughEnabled: true
    },
    'dynamic_biogpt': {
        id: 'dynamic_biogpt',
        name: 'BioGPT',
        serviceType: 'OLLAMA',
        taskType: 'HEALTH',
        modelId: 'biogpt',
        description: 'BioGPT is a domain-specific generative transformer language model pre-trained on large-scale biomedical literature.',
        passthroughEnabled: true
    },
    'dynamic_owl-vit_v2': {
        id: 'dynamic_owl-vit_v2',
        name: 'OWL-ViT v2',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'owl-vit-v2',
        description: 'OWL-ViT v2 is an open vocabulary image object detection model.',
        passthroughEnabled: true
    },
    'dynamic_dito': {
        id: 'dynamic_dito',
        name: 'DITO',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'dito',
        description: 'DITO is an open vocabulary image object detection and segmentation model.',
        passthroughEnabled: true
    },
    'dynamic_biomedclip': {
        id: 'dynamic_biomedclip',
        name: 'BiomedCLIP',
        serviceType: 'OLLAMA',
        taskType: 'HEALTH',
        modelId: 'biomedclip',
        description: 'Zero-shot image classification with the BiomedCLIP biomedical vision-language foundation model.',
        passthroughEnabled: true
    },
    'dynamic_mistral_self-host_7b_nemo': {
        id: 'dynamic_mistral_self-host_7b_nemo',
        name: 'Mistral Self-host (7B & Nemo)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mistral-self-host-(7b-&-nemo)',
        description: 'Mistral is a family of language model engineered for superior performance and efficiency.',
        passthroughEnabled: true
    },
    'dynamic_imagebind': {
        id: 'dynamic_imagebind',
        name: 'ImageBind',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagebind',
        description: 'Deploy Meta\'s ImageBind model on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_nllb': {
        id: 'dynamic_nllb',
        name: 'NLLB',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'nllb',
        description: 'NLLB (No Language Left Behind) is a large language model for machine translation supporting 200 languages.',
        passthroughEnabled: true
    },
    'dynamic_code_llama': {
        id: 'dynamic_code_llama',
        name: 'Code Llama',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'code-llama',
        description: 'Meta\'s family of code models designed for code synthesis, understanding and instruction available in four sizes.',
        passthroughEnabled: true
    },
    'dynamic_cxr_foundation': {
        id: 'dynamic_cxr_foundation',
        name: 'CXR Foundation',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'cxr-foundation',
        description: 'CXR Foundation produces embeddings based on images of chest X-rays that can be used to efficiently train classifier models for chest X-ray related tasks with less data and less compute.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_xl': {
        id: 'dynamic_stable_diffusion_xl',
        name: 'Stable Diffusion XL',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-xl',
        description: 'Latent text-to-image diffusion model capable of generating high fidelity images given a text input.',
        passthroughEnabled: true
    },
    'dynamic_openclip': {
        id: 'dynamic_openclip',
        name: 'OpenCLIP',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'openclip',
        description: 'OpenCLIP is an open source implementation of OpenAI CLIP model.',
        passthroughEnabled: true
    },
    'dynamic_f-vlm_deprecated': {
        id: 'dynamic_f-vlm_deprecated',
        name: 'F-VLM [Deprecated]',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'f-vlm-[deprecated]',
        description: 'F-VLM is an open vocabulary image object detection model.',
        passthroughEnabled: true
    },
    'dynamic_llama_2_quantized': {
        id: 'dynamic_llama_2_quantized',
        name: 'Llama 2 (Quantized)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-2-(quantized)',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_v21': {
        id: 'dynamic_stable_diffusion_v21',
        name: 'Stable Diffusion v2.1',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-v2.1',
        description: 'Latent text-to-image diffusion model taking as input a text prompt, and generates an image.',
        passthroughEnabled: true
    },
    'dynamic_bert_peft': {
        id: 'dynamic_bert_peft',
        name: 'BERT (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'bert-(peft)',
        description: 'Finetune and deploy BERT with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_falcon-instruct_peft': {
        id: 'dynamic_falcon-instruct_peft',
        name: 'Falcon-instruct (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'falcon-instruct-(peft)',
        description: 'Finetune and deploy Falcon-instruct with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_openllama_peft': {
        id: 'dynamic_openllama_peft',
        name: 'OpenLLaMA (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'openllama-(peft)',
        description: 'Finetune and deploy OpenLLaMA with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_roberta-large_peft': {
        id: 'dynamic_roberta-large_peft',
        name: 'RoBERTa-large (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'roberta-large-(peft)',
        description: 'Finetune and deploy RoBERTa-large with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_xlm-roberta-large_peft': {
        id: 'dynamic_xlm-roberta-large_peft',
        name: 'XLM-RoBERTa-large (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'xlm-roberta-large-(peft)',
        description: 'Finetune and deploy XLM-RoBERTa-large with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_stable-diffusion-4x-upscaler': {
        id: 'dynamic_stable-diffusion-4x-upscaler',
        name: 'Stable-diffusion-4x-upscaler',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-4x-upscaler',
        description: 'Stable Diffusion 4x upscaler is a text-conditioned latent diffusion model capable of upscaling images to 4x resolution.',
        passthroughEnabled: true
    },
    'dynamic_segment_anything_sam': {
        id: 'dynamic_segment_anything_sam',
        name: 'Segment Anything (SAM)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'segment-anything-(sam)',
        description: 'Segment Anything (SAM) is a state-of-the-art foundational image segmentation model.',
        passthroughEnabled: true
    },
    'dynamic_bart-large-cnn': {
        id: 'dynamic_bart-large-cnn',
        name: 'Bart-large-cnn',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'bart-large-cnn',
        description: 'A transformer-based seq2seq model with a bidirectional encoder and an autoregressive decoder.',
        passthroughEnabled: true
    },
    'dynamic_imagen_for_captioning_vqa': {
        id: 'dynamic_imagen_for_captioning_vqa',
        name: 'Imagen for Captioning & VQA',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'imagen-for-captioning-&-vqa',
        description: 'Imagen Captioning generates a relevant description for a given image.',
        passthroughEnabled: true
    },
    'dynamic_label_detector_pali_zero-shot': {
        id: 'dynamic_label_detector_pali_zero-shot',
        name: 'Label detector (PaLI zero-shot)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'label-detector-(pali-zero-shot)',
        description: 'Detects custom labels in images without any additional training or fine tuning.',
        passthroughEnabled: true
    },
    'dynamic_embeddings_for_text': {
        id: 'dynamic_embeddings_for_text',
        name: 'Embeddings for Text',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'embeddings-for-text',
        description: 'Converts text data into vector representations for semantic search, classification, clustering, and similar tasks.',
        passthroughEnabled: true
    },
    'dynamic_embeddings_for_text_1': {
        id: 'dynamic_embeddings_for_text_1',
        name: 'Embeddings for Text',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'embeddings-for-text',
        description: 'Converts text data into vector representations for semantic search, classification, clustering, and similar tasks.',
        passthroughEnabled: true
    },
    'dynamic_t5-flan': {
        id: 'dynamic_t5-flan',
        name: 'T5-FLAN',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 't5-flan',
        description: 'T5 (Text-To-Text Transfer Transformer) model with the T5-FLAN checkpoint.',
        passthroughEnabled: true
    },
    'dynamic_t5-11': {
        id: 'dynamic_t5-11',
        name: 'T5-1.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 't5-1.1',
        description: 'T5 (Text-To-Text Transfer Transformer) is a text-to-text encoder-decoder model built by Google.',
        passthroughEnabled: true
    },
    'dynamic_blip2': {
        id: 'dynamic_blip2',
        name: 'BLIP2',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'blip2',
        description: 'BLIP2 is for the image captioning and visual-question-answering tasks.',
        passthroughEnabled: true
    },
    'dynamic_instructpix2pix': {
        id: 'dynamic_instructpix2pix',
        name: 'InstructPix2Pix',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'instructpix2pix',
        description: 'A text conditioned image editing model based on Stable Diffusion.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_inpainting': {
        id: 'dynamic_stable_diffusion_inpainting',
        name: 'Stable Diffusion Inpainting',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-inpainting',
        description: 'Stable Diffusion Inpainting is a latent diffusion model capable of inpainting images given any text input and a mask image.',
        passthroughEnabled: true
    },
    'dynamic_controlnet': {
        id: 'dynamic_controlnet',
        name: 'ControlNet',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'controlnet',
        description: 'Control image generation with text prompt and control image.',
        passthroughEnabled: true
    },
    'dynamic_bert': {
        id: 'dynamic_bert',
        name: 'BERT',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'bert',
        description: 'Neural network-based technique for natural language processing. Use it to train your own question answering system and more.',
        passthroughEnabled: true
    },
    'dynamic_layoutlm_for_vqa': {
        id: 'dynamic_layoutlm_for_vqa',
        name: 'LayoutLM for VQA',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'layoutlm-for-vqa',
        description: 'Fine-tuned for document understanding and information extraction tasks like form and receipt understanding.',
        passthroughEnabled: true
    },
    'dynamic_vilt_vqa': {
        id: 'dynamic_vilt_vqa',
        name: 'ViLT VQA',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'vilt-vqa',
        description: 'Vision-and-Language Transformer (ViLT) model fine-tuned on VQAv2.',
        passthroughEnabled: true
    },
    'dynamic_owl-vit': {
        id: 'dynamic_owl-vit',
        name: 'OWL-ViT',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'owl-vit',
        description: 'Zero-shot, text-conditioned object detection model that can query an image with one or multiple text queries.',
        passthroughEnabled: true
    },
    'dynamic_clip': {
        id: 'dynamic_clip',
        name: 'CLIP',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'clip',
        description: 'Neural network capable of classifying images without prior training on the classes.',
        passthroughEnabled: true
    },
    'dynamic_blip_vqa': {
        id: 'dynamic_blip_vqa',
        name: 'BLIP VQA',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'blip-vqa',
        description: 'A Vision-Language Pre-training (VLP) framework for visual question answering (VQA).',
        passthroughEnabled: true
    },
    'dynamic_blip_image_captioning': {
        id: 'dynamic_blip_image_captioning',
        name: 'BLIP image captioning',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'blip-image-captioning',
        description: 'A Vision-Language Pre-training (VLP) framework for image captioning.',
        passthroughEnabled: true
    },
    'dynamic_embeddings_for_multimodal': {
        id: 'dynamic_embeddings_for_multimodal',
        name: 'Embeddings for Multimodal',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'embeddings-for-multimodal',
        description: 'Generates vectors based on images, which can be used for downstream tasks like image classification, image search, and so on.',
        passthroughEnabled: true
    },
    'dynamic_minimaxai_minimax-m21': {
        id: 'dynamic_minimaxai_minimax-m21',
        name: 'MiniMaxAI/MiniMax-M2.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'minimaxai--minimax-m2.1',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_liquidai_lfm2-26b-exp': {
        id: 'dynamic_liquidai_lfm2-26b-exp',
        name: 'LiquidAI/LFM2-2.6B-Exp',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'liquidai--lfm2-2.6b-exp',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_nvidia_nvidia-nemotron-3-nano-30b-a3b-bf16': {
        id: 'dynamic_nvidia_nvidia-nemotron-3-nano-30b-a3b-bf16',
        name: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'nvidia--nvidia-nemotron-3-nano-30b-a3b-bf16',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_deepseek-ai_deepseek-v32': {
        id: 'dynamic_deepseek-ai_deepseek-v32',
        name: 'deepseek-ai/DeepSeek-V3.2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-ai--deepseek-v3.2',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_black-forest-labs_flux1-dev': {
        id: 'dynamic_black-forest-labs_flux1-dev',
        name: 'black-forest-labs/FLUX.1-dev',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'black-forest-labs--flux.1-dev',
        description: 'Text to image',
        passthroughEnabled: true
    },
    'dynamic_openai_gpt-oss-20b': {
        id: 'dynamic_openai_gpt-oss-20b',
        name: 'openai/gpt-oss-20b',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'openai--gpt-oss-20b',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_meta-llama_llama-31-8b-instruct': {
        id: 'dynamic_meta-llama_llama-31-8b-instruct',
        name: 'meta-llama/Llama-3.1-8B-Instruct',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'meta-llama--llama-3.1-8b-instruct',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_nvidia_nvidia-nemotron-3-nano-30b-a3b-fp8': {
        id: 'dynamic_nvidia_nvidia-nemotron-3-nano-30b-a3b-fp8',
        name: 'nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'nvidia--nvidia-nemotron-3-nano-30b-a3b-fp8',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_sentence-transformers_all-minilm-l6-v2': {
        id: 'dynamic_sentence-transformers_all-minilm-l6-v2',
        name: 'sentence-transformers/all-MiniLM-L6-v2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'sentence-transformers--all-minilm-l6-v2',
        description: 'Sentence similarity',
        passthroughEnabled: true
    },
    'dynamic_stabilityai_stable-diffusion-xl-base-10': {
        id: 'dynamic_stabilityai_stable-diffusion-xl-base-10',
        name: 'stabilityai/stable-diffusion-xl-base-1.0',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stabilityai--stable-diffusion-xl-base-1.0',
        description: 'Text to image',
        passthroughEnabled: true
    },
    'dynamic_deepseek-ai_deepseek-ocr': {
        id: 'dynamic_deepseek-ai_deepseek-ocr',
        name: 'deepseek-ai/DeepSeek-OCR',
        serviceType: 'DOCUMENT_AI',
        taskType: 'IMAGE',
        modelId: 'deepseek-ai--deepseek-ocr',
        description: 'Image text to text',
        passthroughEnabled: true
    },
    'dynamic_openai_gpt-oss-120b': {
        id: 'dynamic_openai_gpt-oss-120b',
        name: 'openai/gpt-oss-120b',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'openai--gpt-oss-120b',
        description: 'Text generation',
        passthroughEnabled: true
    },
    'dynamic_gemma_3n_1': {
        id: 'dynamic_gemma_3n_1',
        name: 'Gemma 3n',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma-3n',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_gemma_3_1': {
        id: 'dynamic_gemma_3_1',
        name: 'Gemma 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma-3',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_gemma_2_1': {
        id: 'dynamic_gemma_2_1',
        name: 'Gemma 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma-2',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_gemma_1': {
        id: 'dynamic_gemma_1',
        name: 'Gemma',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gemma',
        description: 'Lightweight, state-of-the-art open models from Google, built from the same research and technology used to create the Gemini models',
        passthroughEnabled: true
    },
    'dynamic_llama_31_1': {
        id: 'dynamic_llama_31_1',
        name: 'Llama 3.1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.1',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_llama_33_1': {
        id: 'dynamic_llama_33_1',
        name: 'Llama 3.3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.3',
        description: 'Explore and build with Llama 3.3 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_llama_32_1': {
        id: 'dynamic_llama_32_1',
        name: 'Llama 3.2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3.2',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_llama_3_1': {
        id: 'dynamic_llama_3_1',
        name: 'Llama 3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'llama-3',
        description: 'SoTA open LLM built by Meta.',
        passthroughEnabled: true
    },
    'dynamic_mixtral_1': {
        id: 'dynamic_mixtral_1',
        name: 'Mixtral',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mixtral',
        description: 'A Mixture of Experts LLM series developed by Mistral AI.',
        passthroughEnabled: true
    },
    'dynamic_gpt_oss_1': {
        id: 'dynamic_gpt_oss_1',
        name: 'GPT OSS',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'gpt-oss',
        description: 'OpenAI\'s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases',
        passthroughEnabled: true
    },
    'dynamic_qwen3_1': {
        id: 'dynamic_qwen3_1',
        name: 'Qwen3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen3',
        description: 'Explore and build with Qwen3 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_deepseek-r1_1': {
        id: 'dynamic_deepseek-r1_1',
        name: 'DeepSeek-R1',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'deepseek-r1',
        description: 'Serve with deepseek-ai/deepseek-r1 models.',
        passthroughEnabled: true
    },
    'dynamic_phi-3_1': {
        id: 'dynamic_phi-3_1',
        name: 'Phi-3',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'phi-3',
        description: 'Explore and build with Phi-3 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_qwen2_qwen25_1': {
        id: 'dynamic_qwen2_qwen25_1',
        name: 'Qwen2 & Qwen2.5',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qwen2-&-qwen2.5',
        description: 'Explore and build with Qwen2 and Qwen2.5 models on Vertex AI.',
        passthroughEnabled: true
    },
    'dynamic_cloudnerf': {
        id: 'dynamic_cloudnerf',
        name: 'CloudNeRF',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'cloudnerf',
        description: 'The CloudNeRF model blends cutting-edge research from Zip-NeRF (Anti-Aliased Grid-Based Neural Radiance Fields) and CamP (Camera Preconditioning). This card provides two distinct implementations to suit your workflow. Camp-ZipNeRF (JAX framework) leverages the power of the JAX framework for numerical computation and automatic differentiation, prioritizing efficiency and accurate 3D reconstruction from 2D images. Pytorch-ZipNeRF (Pytorch framework) offers a state-of-the-art implementation of the ZipNeRF algorithm within the popular PyTorch deep learning framework.',
        passthroughEnabled: true
    },
    'dynamic_autogluon': {
        id: 'dynamic_autogluon',
        name: 'AutoGluon',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'autogluon',
        description: 'With AutoGluon you can train and deploy high-accuracy machine learning and deep learning models for tabular data.',
        passthroughEnabled: true
    },
    'dynamic_mistral_self-host_7b_nemo_1': {
        id: 'dynamic_mistral_self-host_7b_nemo_1',
        name: 'Mistral Self-host (7B & Nemo)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mistral-self-host-(7b-&-nemo)',
        description: 'Mistral is a family of language model engineered for superior performance and efficiency.',
        passthroughEnabled: true
    },
    'dynamic_code_llama_1': {
        id: 'dynamic_code_llama_1',
        name: 'Code Llama',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'code-llama',
        description: 'Meta\'s family of code models designed for code synthesis, understanding and instruction available in four sizes.',
        passthroughEnabled: true
    },
    'dynamic_movinet_video_action_recognition': {
        id: 'dynamic_movinet_video_action_recognition',
        name: 'MoViNet Video Action Recognition',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'movinet-video-action-recognition',
        description: 'MoViNets (Mobile Video Networks) provide a family of efficient video classification models. The classification model supports video action recognition tasks with proper data preparation and inference algorithms.',
        passthroughEnabled: true
    },
    'dynamic_automl_vision_image_object_detection': {
        id: 'dynamic_automl_vision_image_object_detection',
        name: 'AutoML Vision Image Object Detection',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'automl-vision-image-object-detection',
        description: 'AutoML Vision Image Object Detection enables you to train machine learning models to perform object detection tasks based on your own defined labels.',
        passthroughEnabled: true
    },
    'dynamic_automl_vision_image_classification': {
        id: 'dynamic_automl_vision_image_classification',
        name: 'AutoML Vision Image Classification',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'automl-vision-image-classification',
        description: 'AutoML Vision Image Classification enables you to train machine learning models to classify your images according to your own defined labels.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_xl_1': {
        id: 'dynamic_stable_diffusion_xl_1',
        name: 'Stable Diffusion XL',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-xl',
        description: 'Latent text-to-image diffusion model capable of generating high fidelity images given a text input.',
        passthroughEnabled: true
    },
    'dynamic_yolov8_keras': {
        id: 'dynamic_yolov8_keras',
        name: 'YOLOv8 (Keras)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'yolov8-(keras)',
        description: 'YOLOv8 is a one-stage object detection algorithm that can achieve real-time performance on a single GPU.',
        passthroughEnabled: true
    },
    'dynamic_movinet_video_clip_classification': {
        id: 'dynamic_movinet_video_clip_classification',
        name: 'MoViNet Video Clip Classification',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'movinet-video-clip-classification',
        description: 'MoViNets (Mobile Video Networks) provide a family of efficient video classification models, supporting inference of streaming video and on mobile devices.',
        passthroughEnabled: true
    },
    'dynamic_tfvision_yolov7_deprecated': {
        id: 'dynamic_tfvision_yolov7_deprecated',
        name: 'tfvision/YOLOv7 [deprecated]',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'tfvision--yolov7-[deprecated]',
        description: 'YOLOv7 is a one-stage object detection algorithm that can achieve real-time performance on a single GPU.',
        passthroughEnabled: true
    },
    'dynamic_stable_diffusion_v21_1': {
        id: 'dynamic_stable_diffusion_v21_1',
        name: 'Stable Diffusion v2.1',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'stable-diffusion-v2.1',
        description: 'Latent text-to-image diffusion model taking as input a text prompt, and generates an image.',
        passthroughEnabled: true
    },
    'dynamic_falcon-instruct_peft_1': {
        id: 'dynamic_falcon-instruct_peft_1',
        name: 'Falcon-instruct (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'falcon-instruct-(peft)',
        description: 'Finetune and deploy Falcon-instruct with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_openllama_peft_1': {
        id: 'dynamic_openllama_peft_1',
        name: 'OpenLLaMA (PEFT)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'openllama-(peft)',
        description: 'Finetune and deploy OpenLLaMA with PEFT.',
        passthroughEnabled: true
    },
    'dynamic_proprietary_maxvit_deprecated': {
        id: 'dynamic_proprietary_maxvit_deprecated',
        name: 'Proprietary/MaxViT [Deprecated]',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'proprietary--maxvit-[deprecated]',
        description: 'MaxViT is a family of hybrid (CNN + ViT) image classification models. A Google internal dataset is used to pre-train this model. The pre-trained checkpoint will be loaded as the initial checkpoint. The derived models can be used in commercial products but the weights can not be exported.',
        passthroughEnabled: true
    },
    'dynamic_proprietary_yolo': {
        id: 'dynamic_proprietary_yolo',
        name: 'Proprietary/YOLO',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'proprietary--yolo',
        description: 'YOLOv7 is a one-stage object detection algorithm that can achieve real-time performance on a single GPU. A Google internal dataset is used to pre-train this model. The pre-trained checkpoint will be loaded as the initial checkpoint. The derived models can be used in commercial products but the weights can not be exported.',
        passthroughEnabled: true
    },
    'dynamic_vit_jax': {
        id: 'dynamic_vit_jax',
        name: 'ViT (JAX)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'vit-(jax)',
        description: 'ViT is a transformer-like architecture for image classification.',
        passthroughEnabled: true
    },
    'dynamic_embeddings_for_text_2': {
        id: 'dynamic_embeddings_for_text_2',
        name: 'Embeddings for Text',
        serviceType: 'OLLAMA',
        taskType: 'EMBEDDING',
        modelId: 'embeddings-for-text',
        description: 'Converts text data into vector representations for semantic search, classification, clustering, and similar tasks.',
        passthroughEnabled: true
    },
    'dynamic_proprietary_efficientnet_deprecated': {
        id: 'dynamic_proprietary_efficientnet_deprecated',
        name: 'Proprietary/EfficientNet [Deprecated]',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'proprietary--efficientnet-[deprecated]',
        description: 'EfficientNetV2 uses a variation of convolutional neural network searched from a search space enriched with new ops such as Fused-MBConv. A Google internal dataset is used to pre-train this model. The pre-trained checkpoint will be loaded as the initial checkpoint. The derived models can be used in commercial products but the weights can not be exported.',
        passthroughEnabled: true
    },
    'dynamic_proprietary_spinenet_deprecated': {
        id: 'dynamic_proprietary_spinenet_deprecated',
        name: 'Proprietary/Spinenet [Deprecated]',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'proprietary--spinenet-[deprecated]',
        description: 'RetinaNet object detection model using SpineNet backbone. A Google internal dataset is used to pre-train this model. The pre-trained checkpoint will be loaded as the initial checkpoint. The derived models can be used in commercial products but the weights can not be exported.',
        passthroughEnabled: true
    },
    'dynamic_proprietary_vit_deprecated': {
        id: 'dynamic_proprietary_vit_deprecated',
        name: 'Proprietary/ViT [Deprecated]',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'proprietary--vit-[deprecated]',
        description: 'ViT is a transformer-based architecture for image classification. A Google internal dataset is used to pre-train this model. The pre-trained checkpoint will be loaded as the initial checkpoint. The derived models can be used in commercial products but the weights can not be exported.',
        passthroughEnabled: true
    },
    'dynamic_mask_r-cnn_detectron2': {
        id: 'dynamic_mask_r-cnn_detectron2',
        name: 'Mask R-CNN (Detectron2)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'mask-r-cnn-(detectron2)',
        description: 'Mask R-CNN is an instance segmentation model which extends Faster R-CNN by adding a branch for predicting an object mask in parallel with the existing branch for bounding box recognition.',
        passthroughEnabled: true
    },
    'dynamic_retinanet_detectron2': {
        id: 'dynamic_retinanet_detectron2',
        name: 'RetinaNet (Detectron2)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'retinanet-(detectron2)',
        description: 'RetinaNet is a one-stage object detection model that utilizes a feature pyramid network (FPN) on top of a ResNet and adds a focal loss function to address class imbalance during training.',
        passthroughEnabled: true
    },
    'dynamic_controlnet_1': {
        id: 'dynamic_controlnet_1',
        name: 'ControlNet',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'controlnet',
        description: 'Control image generation with text prompt and control image.',
        passthroughEnabled: true
    },
    'dynamic_faster_r-cnn_detectron2': {
        id: 'dynamic_faster_r-cnn_detectron2',
        name: 'Faster R-CNN (Detectron2)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'faster-r-cnn-(detectron2)',
        description: 'Faster R-CNN is a deep convolutional network used for image object detection.',
        passthroughEnabled: true
    },
    'dynamic_tfvision_yolo_deprecated': {
        id: 'dynamic_tfvision_yolo_deprecated',
        name: 'tfvision/YOLO [deprecated]',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'tfvision--yolo-[deprecated]',
        description: 'YOLO algorithm is a one-stage object detection algorithm that can achieve real-time performance on a single GPU.',
        passthroughEnabled: true
    },
    'dynamic_deeplabv3_with_checkpoint': {
        id: 'dynamic_deeplabv3_with_checkpoint',
        name: 'DeepLabv3+ (with checkpoint)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'deeplabv3+-(with-checkpoint)',
        description: 'Semantic segmentation is the task of assigning a label to each pixel in an image, where each label corresponds to a specific class of object or scene element.',
        passthroughEnabled: true
    },
    'dynamic_resnet_with_checkpoint': {
        id: 'dynamic_resnet_with_checkpoint',
        name: 'ResNet (with checkpoint)',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'resnet-(with-checkpoint)',
        description: 'Image classification model as described in the paper "Deep Residual Learning for Image Recognition".',
        passthroughEnabled: true
    },
    'dynamic_tfvision_vit_deprecated': {
        id: 'dynamic_tfvision_vit_deprecated',
        name: 'tfvision/vit [deprecated]',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'tfvision--vit-[deprecated]',
        description: 'The Vision Transformer (ViT) is a transformer-based architecture for image classification.',
        passthroughEnabled: true
    },
    'dynamic_tfhub_efficientnetv2_deprecated': {
        id: 'dynamic_tfhub_efficientnetv2_deprecated',
        name: 'tfhub/EfficientNetV2 [deprecated]',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'tfhub--efficientnetv2-[deprecated]',
        description: 'EfficientNet V2 are a family of image classification models, which achieve better parameter efficiency and faster training speed than prior arts.',
        passthroughEnabled: true
    },
    'dynamic_translation_llm': {
        id: 'dynamic_translation_llm',
        name: 'Translation LLM',
        serviceType: 'TRANSLATION',
        taskType: 'TEXT',
        modelId: 'translation-llm',
        description: 'The best performing translation model, finetuned from Gemini specifically for translating text between languages. Brought to you by the team who brought Google Translate to enterprise.',
        passthroughEnabled: true
    },
    'dynamic_codestral_2_1': {
        id: 'dynamic_codestral_2_1',
        name: 'Codestral 2',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'codestral-2',
        description: 'A cutting-edge model specifically designed for code generation, including fill-in-the-middle and code completion.',
        passthroughEnabled: true
    },
    'dynamic_codestral_2501_self-deploy_1': {
        id: 'dynamic_codestral_2501_self-deploy_1',
        name: 'Codestral (25.01) (Self-Deploy)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'codestral-(25.01)-(self-deploy)',
        description: 'A cutting-edge model specifically designed for code generation, including fill-in-the-middle and code completion.',
        passthroughEnabled: true
    },
    'dynamic_jamba_large_16_1': {
        id: 'dynamic_jamba_large_16_1',
        name: 'Jamba Large 1.6',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'jamba-large-1.6',
        description: 'Jamba Large 1.6 offers fast, high-quality performance with superior long context handling and speed.',
        passthroughEnabled: true
    },
    'dynamic_virtueguard-text-lite_self-deploy': {
        id: 'dynamic_virtueguard-text-lite_self-deploy',
        name: 'Virtueguard-Text-Lite (Self-Deploy)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'virtueguard-text-lite-(self-deploy)',
        description: 'This model is trained to monitors AI outputs, ensuring they remain aligned with safety and security protocols in real-time.',
        passthroughEnabled: true
    },
    'dynamic_contextual_ai_reranker_self-deploy': {
        id: 'dynamic_contextual_ai_reranker_self-deploy',
        name: 'Contextual AI Reranker (Self-Deploy)',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'contextual-ai-reranker-(self-deploy)',
        description: 'Instruction following reranker with best in class price-performance and available in multiple sizes.',
        passthroughEnabled: true
    },
    'dynamic_voyage_35-lite': {
        id: 'dynamic_voyage_35-lite',
        name: 'Voyage 3.5-lite',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'voyage-3.5-lite',
        description: 'Cost-optimized text embedding model delivering high-quality retrieval performance with 6.5x lower cost than OpenAI-v3-large while maintaining superior accuracy.',
        passthroughEnabled: true
    },
    'dynamic_cube_by_csm': {
        id: 'dynamic_cube_by_csm',
        name: 'Cube by CSM',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'cube-by-csm',
        description: 'Cube by CSM is an AI model that transforms 2D images into production-ready 3D models.',
        passthroughEnabled: true
    },
    'dynamic_qodo-embed-1-7b': {
        id: 'dynamic_qodo-embed-1-7b',
        name: 'Qodo-Embed-1-7B',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'qodo-embed-1-7b',
        description: 'A suite of large-scale state-of-the-art code embedding models for efficient code & text retrieval, enhancing the search accuracy of RAG methods.',
        passthroughEnabled: true
    },
    'dynamic_voyage-multimodal-35': {
        id: 'dynamic_voyage-multimodal-35',
        name: 'voyage-multimodal-3.5',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'voyage-multimodal-3.5',
        description: 'Rich multimodal embedding model that can vectorize interleaved text, content-rich images, and video. 32K context length.',
        passthroughEnabled: true
    },
    'dynamic_voyage-4-lite': {
        id: 'dynamic_voyage-4-lite',
        name: 'voyage-4-lite',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'voyage-4-lite',
        description: 'Text embedding model optimized for general-purpose retrieval quality, latency, and cost for AI applications. 32K context length.',
        passthroughEnabled: true
    },
    'dynamic_voyage-4': {
        id: 'dynamic_voyage-4',
        name: 'voyage-4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'voyage-4',
        description: 'Text embedding model optimized for general-purpose (including multilingual) retrieval/search and AI applications. 32K context length.',
        passthroughEnabled: true
    },
    'dynamic_voyage-4-large': {
        id: 'dynamic_voyage-4-large',
        name: 'voyage-4-large',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'voyage-4-large',
        description: 'State-of-the-art text embedding model with the best general-purpose and multilingual retrieval quality. 32K context length.',
        passthroughEnabled: true
    },
    'dynamic_sea-lion_v4_1': {
        id: 'dynamic_sea-lion_v4_1',
        name: 'SEA-LION v4',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'sea-lion-v4',
        description: 'A collection of Large Language Models pretrained and instruct-tuned for the Southeast Asia region.',
        passthroughEnabled: true
    },
    'dynamic_video_speech_transcription': {
        id: 'dynamic_video_speech_transcription',
        name: 'Video Speech Transcription',
        serviceType: 'SPEECH',
        taskType: 'AUDIO',
        modelId: 'video-speech-transcription',
        description: 'Useful for transcribing the speech in video.',
        passthroughEnabled: true
    },
    'dynamic_video_text_detection': {
        id: 'dynamic_video_text_detection',
        name: 'Video Text Detection',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'video-text-detection',
        description: 'Useful for detecting visible text in video.',
        passthroughEnabled: true
    },
    'dynamic_biomedclip_1': {
        id: 'dynamic_biomedclip_1',
        name: 'BiomedCLIP',
        serviceType: 'OLLAMA',
        taskType: 'HEALTH',
        modelId: 'biomedclip',
        description: 'Zero-shot image classification with the BiomedCLIP biomedical vision-language foundation model.',
        passthroughEnabled: true
    },
    'dynamic_movinet_video_action_recognition_1': {
        id: 'dynamic_movinet_video_action_recognition_1',
        name: 'MoViNet Video Action Recognition',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'movinet-video-action-recognition',
        description: 'MoViNets (Mobile Video Networks) provide a family of efficient video classification models. The classification model supports video action recognition tasks with proper data preparation and inference algorithms.',
        passthroughEnabled: true
    },
    'dynamic_bytetrack_multi-object_tracking': {
        id: 'dynamic_bytetrack_multi-object_tracking',
        name: 'Bytetrack Multi-Object Tracking',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'bytetrack-multi-object-tracking',
        description: 'ByteTrack is a multi-object tracking model that detects, identifies, and tracks objects across video frames.',
        passthroughEnabled: true
    },
    'dynamic_movinet_video_clip_classification_1': {
        id: 'dynamic_movinet_video_clip_classification_1',
        name: 'MoViNet Video Clip Classification',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'movinet-video-clip-classification',
        description: 'MoViNets (Mobile Video Networks) provide a family of efficient video classification models, supporting inference of streaming video and on mobile devices.',
        passthroughEnabled: true
    },
    'dynamic_pic2word_composed_image_retrieval': {
        id: 'dynamic_pic2word_composed_image_retrieval',
        name: 'Pic2Word Composed Image Retrieval',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'pic2word-composed-image-retrieval',
        description: 'Pic2Word is a state of the art image retrieval model.',
        passthroughEnabled: true
    },
    'dynamic_text_translation': {
        id: 'dynamic_text_translation',
        name: 'Text Translation',
        serviceType: 'TRANSLATION',
        taskType: 'TEXT',
        modelId: 'text-translation',
        description: 'Use Google\'s proven pre-trained text model to get text translations for 100+ languages.',
        passthroughEnabled: true
    },
    'dynamic_text_moderation': {
        id: 'dynamic_text_moderation',
        name: 'Text Moderation',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'text-moderation',
        description: 'Text moderation analyzes a document and returns a list of harmful and sensitive categories that apply to the text found in the document.',
        passthroughEnabled: true
    },
    'dynamic_watermark_detector': {
        id: 'dynamic_watermark_detector',
        name: 'Watermark detector',
        serviceType: 'OLLAMA',
        taskType: 'IMAGE',
        modelId: 'watermark-detector',
        description: 'Watermark detector is a prebuilt model that detects watermarks in the input image.',
        passthroughEnabled: true
    },
    'dynamic_text_detector_vision_api': {
        id: 'dynamic_text_detector_vision_api',
        name: 'Text detector (Vision API)',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'text-detector-(vision-api)',
        description: 'Text detector detects and extracts text from images. It uses optical character recognition (OCR) for an image to recognize text and convert it to machine coded text.',
        passthroughEnabled: true
    },
    'dynamic_tabnet': {
        id: 'dynamic_tabnet',
        name: 'TabNet',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'tabnet',
        description: 'TabNet is a general model which performs well on a wide range of classification and regression tasks.',
        passthroughEnabled: true
    },
    'dynamic_form_parser': {
        id: 'dynamic_form_parser',
        name: 'Form Parser',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'form-parser',
        description: 'Document AI Form Parser applies advanced machine learning technologies to extract key-value pairs, checkboxes, tables from documents in over 200+ languages.',
        passthroughEnabled: true
    },
    'dynamic_face_detector_vision_api': {
        id: 'dynamic_face_detector_vision_api',
        name: 'Face detector (Vision API)',
        serviceType: 'CLOUD_VISION',
        taskType: 'VIDEO',
        modelId: 'face-detector-(vision-api)',
        description: 'Face detector is a prebuilt Vision API model that detects multiple faces in media (images, video) and provides bounding polygons for the face and other facial "landmarks" along with their corresponding confidence values.',
        passthroughEnabled: true
    },
    'dynamic_document_ai_ocr_processor': {
        id: 'dynamic_document_ai_ocr_processor',
        name: 'Document AI OCR processor',
        serviceType: 'DOCUMENT_AI',
        taskType: 'TEXT',
        modelId: 'document-ai-ocr-processor',
        description: 'Document OCR can identify and extract text from documents in over 200 printed languages and 50 handwritten languages.',
        passthroughEnabled: true
    },
    'dynamic_content_moderation_vision': {
        id: 'dynamic_content_moderation_vision',
        name: 'Content moderation (Vision)',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        modelId: 'content-moderation-(vision)',
        description: 'Content Moderator (Vision) detects objectionable or unwanted content across predefined content labels (e.g., adult, violence, spoof) or custom labels provided by the user.',
        passthroughEnabled: true
    },
    'dynamic_automl_tabular_workflow': {
        id: 'dynamic_automl_tabular_workflow',
        name: 'AutoML Tabular Workflow',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'automl-tabular-workflow',
        description: 'Tabular Workflow for End-to-End AutoML is the complete AutoML pipeline for classification and regression tasks.',
        passthroughEnabled: true
    },
    'dynamic_tag_recognizer': {
        id: 'dynamic_tag_recognizer',
        name: 'Tag recognizer',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'tag-recognizer',
        description: 'Extract text in product and price tags',
        passthroughEnabled: true
    },
    'dynamic_product_recognizer': {
        id: 'dynamic_product_recognizer',
        name: 'Product recognizer',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'product-recognizer',
        description: 'Identify products at the GTIN or UPC level',
        passthroughEnabled: true
    },
    'dynamic_person_blur': {
        id: 'dynamic_person_blur',
        name: 'Person blur',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'person-blur',
        description: 'Mask or blur a person\'s appearance in video',
        passthroughEnabled: true
    },
    'dynamic_ppe_detector': {
        id: 'dynamic_ppe_detector',
        name: 'PPE detector',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'ppe-detector',
        description: 'Identify people and personal protective equipment (PPE).',
        passthroughEnabled: true
    },
    'dynamic_object_detector': {
        id: 'dynamic_object_detector',
        name: 'Object detector',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'object-detector',
        description: 'Identify and locate objects in video',
        passthroughEnabled: true
    },
    'dynamic_syntax_analysis': {
        id: 'dynamic_syntax_analysis',
        name: 'Syntax analysis',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'syntax-analysis',
        description: 'Syntactic analysis extracts linguistic information, breaking up the given text into a series of sentences and tokens (generally, word boundaries), providing further analysis on those tokens.',
        passthroughEnabled: true
    },
    'dynamic_entity_sentiment_analysis': {
        id: 'dynamic_entity_sentiment_analysis',
        name: 'Entity sentiment analysis',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'entity-sentiment-analysis',
        description: 'Entity Sentiment Analysis inspects the given text for known entities (proper nouns and common nouns), returns information about those entities, and identifies the prevailing emotional opinion of the entity within the text, especially to determine a writer\'s attitude toward the entity as positive, negative, or neutral.',
        passthroughEnabled: true
    },
    'dynamic_sentiment_analysis': {
        id: 'dynamic_sentiment_analysis',
        name: 'Sentiment analysis',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'sentiment-analysis',
        description: 'Sentiment analysis attempts to determine the overall attitude (positive or negative) expressed within the text. Sentiment is represented by numerical score and magnitude values.',
        passthroughEnabled: true
    },
    'dynamic_content_classification': {
        id: 'dynamic_content_classification',
        name: 'Content classification',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'content-classification',
        description: 'Use Google\'s state-of-the-art language technology to analyzes text content and returns content categories for the content. The latest version of Content Classification supports over 1,000 categories.',
        passthroughEnabled: true
    },
    'dynamic_person_vehicle_detector': {
        id: 'dynamic_person_vehicle_detector',
        name: 'Person/vehicle detector',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'person--vehicle-detector',
        description: 'Detects and counts people and vehicles in video.',
        passthroughEnabled: true
    },
    'dynamic_entity_analysis': {
        id: 'dynamic_entity_analysis',
        name: 'Entity analysis',
        serviceType: 'OLLAMA',
        taskType: 'TEXT',
        modelId: 'entity-analysis',
        description: 'Inspect text to identify and label persons, organizations, locations, events, products and more.',
        passthroughEnabled: true
    },
    'dynamic_occupancy_analytics': {
        id: 'dynamic_occupancy_analytics',
        name: 'Occupancy analytics',
        serviceType: 'OLLAMA',
        taskType: 'VIDEO',
        modelId: 'occupancy-analytics',
        description: 'Detect people and vehicles in a video or image, plus zone detection, dwell time, and more.',
        passthroughEnabled: true
    }
};
