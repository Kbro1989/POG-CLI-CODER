import { AICapability } from './CapabilityRegistry.js';

export const CloudflareModelRegistry: Record<string, AICapability> = {
    'cf_pipecat_aismart_turn_v2': {
        id: 'cf_pipecat_aismart_turn_v2',
        name: '@cf/pipecat-ai/smart-turn-v2',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/pipecat-ai/smart-turn-v2',
        description: 'An open source, community-driven, native audio turn detection model in 2nd version',
        passthroughEnabled: true
    },
    'cf_openaigpt_oss_120b': {
        id: 'cf_openaigpt_oss_120b',
        name: '@cf/openai/gpt-oss-120b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/openai/gpt-oss-120b',
        description: 'OpenAI',
        passthroughEnabled: true
    },
    'cf_qwenqwen15_05b_chat': {
        id: 'cf_qwenqwen15_05b_chat',
        name: '@cf/qwen/qwen1.5-0.5b-chat',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwen1.5-0.5b-chat',
        description: 'Qwen1.5 is the improved version of Qwen, the large language model series developed by Alibaba Cloud.',
        passthroughEnabled: true
    },
    'cf_baaibge_m3': {
        id: 'cf_baaibge_m3',
        name: '@cf/baai/bge-m3',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/baai/bge-m3',
        description: 'Multi-Functionality, Multi-Linguality, and Multi-Granularity embeddings model.',
        passthroughEnabled: true
    },
    'cf_huggingfacedistilbert_sst_2_int8': {
        id: 'cf_huggingfacedistilbert_sst_2_int8',
        name: '@cf/huggingface/distilbert-sst-2-int8',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/huggingface/distilbert-sst-2-int8',
        description: 'Distilled BERT model that was finetuned on SST-2 for sentiment classification',
        passthroughEnabled: true
    },
    'cf_googlegemma_2b_it_lora': {
        id: 'cf_googlegemma_2b_it_lora',
        name: '@cf/google/gemma-2b-it-lora',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/google/gemma-2b-it-lora',
        description: 'This is a Gemma-2B base model that Cloudflare dedicates for inference with LoRA adapters. Gemma is a...',
        passthroughEnabled: true
    },
    'cf_hf_nexusflowstarling_lm_7b_beta': {
        id: 'cf_hf_nexusflowstarling_lm_7b_beta',
        name: '@hf/nexusflow/starling-lm-7b-beta',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/nexusflow/starling-lm-7b-beta',
        description: 'We introduce Starling-LM-7B-beta, an open large language model (LLM) trained by Reinforcement Learni...',
        passthroughEnabled: true
    },
    'cf_black_forest_labsflux_2_klein_9b': {
        id: 'cf_black_forest_labsflux_2_klein_9b',
        name: '@cf/black-forest-labs/flux-2-klein-9b',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/black-forest-labs/flux-2-klein-9b',
        description: 'FLUX.2 [klein] 9B is a 9 billion parameter model that can generate images from text descriptions and...',
        passthroughEnabled: true
    },
    'cf_metallama_3_8b_instruct': {
        id: 'cf_metallama_3_8b_instruct',
        name: '@cf/meta/llama-3-8b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3-8b-instruct',
        description: 'Generation over generation, Meta Llama 3 demonstrates state-of-the-art performance on a wide range o...',
        passthroughEnabled: true
    },
    'cf_metallama_32_3b_instruct': {
        id: 'cf_metallama_32_3b_instruct',
        name: '@cf/meta/llama-3.2-3b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3.2-3b-instruct',
        description: 'The Llama 3.2 instruction-tuned text only models are optimized for multilingual dialogue use cases, ...',
        passthroughEnabled: true
    },
    'cf_hf_theblokeneural_chat_7b_v3_1_awq': {
        id: 'cf_hf_theblokeneural_chat_7b_v3_1_awq',
        name: '@hf/thebloke/neural-chat-7b-v3-1-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/neural-chat-7b-v3-1-awq',
        description: 'This model is a fine-tuned 7B parameter LLM on the Intel Gaudi 2 processor from the mistralai/Mistra...',
        passthroughEnabled: true
    },
    'cf_metallama_guard_3_8b': {
        id: 'cf_metallama_guard_3_8b',
        name: '@cf/meta/llama-guard-3-8b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-guard-3-8b',
        description: 'Llama Guard 3 is a Llama-3.1-8B pretrained model, fine-tuned for content safety classification. Simi...',
        passthroughEnabled: true
    },
    'cf_qwenqwen3_embedding_06b': {
        id: 'cf_qwenqwen3_embedding_06b',
        name: '@cf/qwen/qwen3-embedding-0.6b',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/qwen/qwen3-embedding-0.6b',
        description: 'The Qwen3 Embedding model series is the latest proprietary model of the Qwen family, specifically de...',
        passthroughEnabled: true
    },
    'cf_metallama_2_7b_chat_fp16': {
        id: 'cf_metallama_2_7b_chat_fp16',
        name: '@cf/meta/llama-2-7b-chat-fp16',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-2-7b-chat-fp16',
        description: 'Full precision (fp16) generative text model with 7 billion parameters from Meta',
        passthroughEnabled: true
    },
    'cf_mistralmistral_7b_instruct_v01': {
        id: 'cf_mistralmistral_7b_instruct_v01',
        name: '@cf/mistral/mistral-7b-instruct-v0.1',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/mistral/mistral-7b-instruct-v0.1',
        description: 'Instruct fine-tuned version of the Mistral-7b generative text model with 7 billion parameters',
        passthroughEnabled: true
    },
    'cf_myshell_aimelotts': {
        id: 'cf_myshell_aimelotts',
        name: '@cf/myshell-ai/melotts',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/myshell-ai/melotts',
        description: 'MeloTTS is a high-quality multi-lingual text-to-speech library by MyShell.ai.',
        passthroughEnabled: true
    },
    'cf_mistralmistral_7b_instruct_v02_lora': {
        id: 'cf_mistralmistral_7b_instruct_v02_lora',
        name: '@cf/mistral/mistral-7b-instruct-v0.2-lora',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/mistral/mistral-7b-instruct-v0.2-lora',
        description: 'The Mistral-7B-Instruct-v0.2 Large Language Model (LLM) is an instruct fine-tuned version of the Mis...',
        passthroughEnabled: true
    },
    'cf_deepgramaura_2_es': {
        id: 'cf_deepgramaura_2_es',
        name: '@cf/deepgram/aura-2-es',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/deepgram/aura-2-es',
        description: 'Aura-2 is a context-aware text-to-speech (TTS) model that applies natural pacing, expressiveness, an...',
        passthroughEnabled: true
    },
    'cf_openaiwhisper': {
        id: 'cf_openaiwhisper',
        name: '@cf/openai/whisper',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/openai/whisper',
        description: 'Whisper is a general-purpose speech recognition model. It is trained on a large dataset of diverse a...',
        passthroughEnabled: true
    },
    'cf_tinyllamatinyllama_11b_chat_v10': {
        id: 'cf_tinyllamatinyllama_11b_chat_v10',
        name: '@cf/tinyllama/tinyllama-1.1b-chat-v1.0',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/tinyllama/tinyllama-1.1b-chat-v1.0',
        description: 'The TinyLlama project aims to pretrain a 1.1B Llama model on 3 trillion tokens. This is the chat mod...',
        passthroughEnabled: true
    },
    'cf_pfnetplamo_embedding_1b': {
        id: 'cf_pfnetplamo_embedding_1b',
        name: '@cf/pfnet/plamo-embedding-1b',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/pfnet/plamo-embedding-1b',
        description: 'PLaMo-Embedding-1B is a Japanese text embedding model developed by Preferred Networks, Inc.',
        passthroughEnabled: true
    },
    'cf_hf_mistralmistral_7b_instruct_v02': {
        id: 'cf_hf_mistralmistral_7b_instruct_v02',
        name: '@hf/mistral/mistral-7b-instruct-v0.2',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/mistral/mistral-7b-instruct-v0.2',
        description: 'The Mistral-7B-Instruct-v0.2 Large Language Model (LLM) is an instruct fine-tuned version of the Mis...',
        passthroughEnabled: true
    },
    'cf_fblgituna_cybertron_7b_v2_bf16': {
        id: 'cf_fblgituna_cybertron_7b_v2_bf16',
        name: '@cf/fblgit/una-cybertron-7b-v2-bf16',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/fblgit/una-cybertron-7b-v2-bf16',
        description: 'Cybertron 7B v2 is a 7B MistralAI based model, best on it\'s series. It was trained with SFT, DPO and...',
        passthroughEnabled: true
    },
    'cf_llava_hfllava_15_7b_hf': {
        id: 'cf_llava_hfllava_15_7b_hf',
        name: '@cf/llava-hf/llava-1.5-7b-hf',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/llava-hf/llava-1.5-7b-hf',
        description: 'LLaVA is an open-source chatbot trained by fine-tuning LLaMA/Vicuna on GPT-generated multimodal inst...',
        passthroughEnabled: true
    },
    'cf_deepseek_aideepseek_r1_distill_qwen_32b': {
        id: 'cf_deepseek_aideepseek_r1_distill_qwen_32b',
        name: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
        description: 'DeepSeek-R1-Distill-Qwen-32B is a model distilled from DeepSeek-R1 based on Qwen2.5. It outperforms ...',
        passthroughEnabled: true
    },
    'cf_runwaymlstable_diffusion_v1_5_inpainting': {
        id: 'cf_runwaymlstable_diffusion_v1_5_inpainting',
        name: '@cf/runwayml/stable-diffusion-v1-5-inpainting',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/runwayml/stable-diffusion-v1-5-inpainting',
        description: 'Stable Diffusion Inpainting is a latent text-to-image diffusion model capable of generating photo-re...',
        passthroughEnabled: true
    },
    'cf_deepgramflux': {
        id: 'cf_deepgramflux',
        name: '@cf/deepgram/flux',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/deepgram/flux',
        description: 'Flux is the first conversational speech recognition model built specifically for voice agents.',
        passthroughEnabled: true
    },
    'cf_deepgramnova_3': {
        id: 'cf_deepgramnova_3',
        name: '@cf/deepgram/nova-3',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/deepgram/nova-3',
        description: 'Transcribe audio using Deepgram',
        passthroughEnabled: true
    },
    'cf_black_forest_labsflux_1_schnell': {
        id: 'cf_black_forest_labsflux_1_schnell',
        name: '@cf/black-forest-labs/flux-1-schnell',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/black-forest-labs/flux-1-schnell',
        description: 'FLUX.1 [schnell] is a 12 billion parameter rectified flow transformer capable of generating images f...',
        passthroughEnabled: true
    },
    'cf_theblokediscolm_german_7b_v1_awq': {
        id: 'cf_theblokediscolm_german_7b_v1_awq',
        name: '@cf/thebloke/discolm-german-7b-v1-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/thebloke/discolm-german-7b-v1-awq',
        description: 'DiscoLM German 7b is a Mistral-based large language model with a focus on German-language applicatio...',
        passthroughEnabled: true
    },
    'cf_metallama_2_7b_chat_int8': {
        id: 'cf_metallama_2_7b_chat_int8',
        name: '@cf/meta/llama-2-7b-chat-int8',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-2-7b-chat-int8',
        description: 'Quantized (int8) generative text model with 7 billion parameters from Meta',
        passthroughEnabled: true
    },
    'cf_metallama_31_8b_instruct_fp8': {
        id: 'cf_metallama_31_8b_instruct_fp8',
        name: '@cf/meta/llama-3.1-8b-instruct-fp8',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3.1-8b-instruct-fp8',
        description: 'Llama 3.1 8B quantized to FP8 precision',
        passthroughEnabled: true
    },
    'cf_hf_theblokemistral_7b_instruct_v01_awq': {
        id: 'cf_hf_theblokemistral_7b_instruct_v01_awq',
        name: '@hf/thebloke/mistral-7b-instruct-v0.1-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/mistral-7b-instruct-v0.1-awq',
        description: 'Mistral 7B Instruct v0.1 AWQ is an efficient, accurate and blazing-fast low-bit weight quantized Mis...',
        passthroughEnabled: true
    },
    'cf_qwenqwen15_7b_chat_awq': {
        id: 'cf_qwenqwen15_7b_chat_awq',
        name: '@cf/qwen/qwen1.5-7b-chat-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwen1.5-7b-chat-awq',
        description: 'Qwen1.5 is the improved version of Qwen, the large language model series developed by Alibaba Cloud....',
        passthroughEnabled: true
    },
    'cf_metallama_32_1b_instruct': {
        id: 'cf_metallama_32_1b_instruct',
        name: '@cf/meta/llama-3.2-1b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3.2-1b-instruct',
        description: 'The Llama 3.2 instruction-tuned text only models are optimized for multilingual dialogue use cases, ...',
        passthroughEnabled: true
    },
    'cf_hf_theblokellama_2_13b_chat_awq': {
        id: 'cf_hf_theblokellama_2_13b_chat_awq',
        name: '@hf/thebloke/llama-2-13b-chat-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/llama-2-13b-chat-awq',
        description: 'Llama 2 13B Chat AWQ is an efficient, accurate and blazing-fast low-bit weight quantized Llama 2 var...',
        passthroughEnabled: true
    },
    'cf_microsoftresnet_50': {
        id: 'cf_microsoftresnet_50',
        name: '@cf/microsoft/resnet-50',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/microsoft/resnet-50',
        description: '50 layers deep image classification CNN trained on more than 1M images from ImageNet',
        passthroughEnabled: true
    },
    'cf_bytedancestable_diffusion_xl_lightning': {
        id: 'cf_bytedancestable_diffusion_xl_lightning',
        name: '@cf/bytedance/stable-diffusion-xl-lightning',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/bytedance/stable-diffusion-xl-lightning',
        description: 'SDXL-Lightning is a lightning-fast text-to-image generation model. It can generate high-quality 1024...',
        passthroughEnabled: true
    },
    'cf_hf_theblokedeepseek_coder_67b_base_awq': {
        id: 'cf_hf_theblokedeepseek_coder_67b_base_awq',
        name: '@hf/thebloke/deepseek-coder-6.7b-base-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/deepseek-coder-6.7b-base-awq',
        description: 'Deepseek Coder is composed of a series of code language models, each trained from scratch on 2T toke...',
        passthroughEnabled: true
    },
    'cf_meta_llamallama_2_7b_chat_hf_lora': {
        id: 'cf_meta_llamallama_2_7b_chat_hf_lora',
        name: '@cf/meta-llama/llama-2-7b-chat-hf-lora',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta-llama/llama-2-7b-chat-hf-lora',
        description: 'This is a Llama2 base model that Cloudflare dedicated for inference with LoRA adapters. Llama 2 is a...',
        passthroughEnabled: true
    },
    'cf_metallama_33_70b_instruct_fp8_fast': {
        id: 'cf_metallama_33_70b_instruct_fp8_fast',
        name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        description: 'Llama 3.3 70B quantized to fp8 precision, optimized to be faster.',
        passthroughEnabled: true
    },
    'cf_ibm_granitegranite_40_h_micro': {
        id: 'cf_ibm_granitegranite_40_h_micro',
        name: '@cf/ibm-granite/granite-4.0-h-micro',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/ibm-granite/granite-4.0-h-micro',
        description: 'Granite 4.0 instruct models deliver strong performance across benchmarks, achieving industry-leading...',
        passthroughEnabled: true
    },
    'cf_lykondreamshaper_8_lcm': {
        id: 'cf_lykondreamshaper_8_lcm',
        name: '@cf/lykon/dreamshaper-8-lcm',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/lykon/dreamshaper-8-lcm',
        description: 'Stable Diffusion model that has been fine-tuned to be better at photorealism without sacrificing ran...',
        passthroughEnabled: true
    },
    'cf_leonardophoenix_10': {
        id: 'cf_leonardophoenix_10',
        name: '@cf/leonardo/phoenix-1.0',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/leonardo/phoenix-1.0',
        description: 'Phoenix 1.0 is a model by Leonardo.Ai that generates images with exceptional prompt adherence and co...',
        passthroughEnabled: true
    },
    'cf_stabilityaistable_diffusion_xl_base_10': {
        id: 'cf_stabilityaistable_diffusion_xl_base_10',
        name: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
        description: 'Diffusion-based text-to-image generative model by Stability AI. Generates and modify images based on...',
        passthroughEnabled: true
    },
    'cf_hf_theblokeopenhermes_25_mistral_7b_awq': {
        id: 'cf_hf_theblokeopenhermes_25_mistral_7b_awq',
        name: '@hf/thebloke/openhermes-2.5-mistral-7b-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/openhermes-2.5-mistral-7b-awq',
        description: 'OpenHermes 2.5 Mistral 7B is a state of the art Mistral Fine-tune, a continuation of OpenHermes 2 mo...',
        passthroughEnabled: true
    },
    'cf_metam2m100_12b': {
        id: 'cf_metam2m100_12b',
        name: '@cf/meta/m2m100-1.2b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/m2m100-1.2b',
        description: 'Multilingual encoder-decoder (seq-to-seq) model trained for Many-to-Many multilingual translation',
        passthroughEnabled: true
    },
    'cf_ai4bharatindictrans2_en_indic_1b': {
        id: 'cf_ai4bharatindictrans2_en_indic_1b',
        name: '@cf/ai4bharat/indictrans2-en-indic-1B',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/ai4bharat/indictrans2-en-indic-1B',
        description: 'IndicTrans2 is the first open-source transformer-based multilingual NMT model that supports high-qua...',
        passthroughEnabled: true
    },
    'cf_hf_theblokedeepseek_coder_67b_instruct_awq': {
        id: 'cf_hf_theblokedeepseek_coder_67b_instruct_awq',
        name: '@hf/thebloke/deepseek-coder-6.7b-instruct-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/deepseek-coder-6.7b-instruct-awq',
        description: 'Deepseek Coder is composed of a series of code language models, each trained from scratch on 2T toke...',
        passthroughEnabled: true
    },
    'cf_black_forest_labsflux_2_klein_4b': {
        id: 'cf_black_forest_labsflux_2_klein_4b',
        name: '@cf/black-forest-labs/flux-2-klein-4b',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/black-forest-labs/flux-2-klein-4b',
        description: 'FLUX.2 [klein] is an ultra-fast, distilled image model. It unifies image generation and editing in a...',
        passthroughEnabled: true
    },
    'cf_baaibge_small_en_v15': {
        id: 'cf_baaibge_small_en_v15',
        name: '@cf/baai/bge-small-en-v1.5',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/baai/bge-small-en-v1.5',
        description: 'BAAI general embedding (Small) model that transforms any given text into a 384-dimensional vector',
        passthroughEnabled: true
    },
    'cf_qwenqwen25_coder_32b_instruct': {
        id: 'cf_qwenqwen25_coder_32b_instruct',
        name: '@cf/qwen/qwen2.5-coder-32b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwen2.5-coder-32b-instruct',
        description: 'Qwen2.5-Coder is the latest series of Code-Specific Qwen large language models (formerly known as Co...',
        passthroughEnabled: true
    },
    'cf_deepseek_aideepseek_math_7b_instruct': {
        id: 'cf_deepseek_aideepseek_math_7b_instruct',
        name: '@cf/deepseek-ai/deepseek-math-7b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/deepseek-ai/deepseek-math-7b-instruct',
        description: 'DeepSeekMath-Instruct 7B is a mathematically instructed tuning model derived from DeepSeekMath-Base ...',
        passthroughEnabled: true
    },
    'cf_tiiuaefalcon_7b_instruct': {
        id: 'cf_tiiuaefalcon_7b_instruct',
        name: '@cf/tiiuae/falcon-7b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/tiiuae/falcon-7b-instruct',
        description: 'Falcon-7B-Instruct is a 7B parameters causal decoder-only model built by TII based on Falcon-7B and ...',
        passthroughEnabled: true
    },
    'cf_hf_nousresearchhermes_2_pro_mistral_7b': {
        id: 'cf_hf_nousresearchhermes_2_pro_mistral_7b',
        name: '@hf/nousresearch/hermes-2-pro-mistral-7b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/nousresearch/hermes-2-pro-mistral-7b',
        description: 'Hermes 2 Pro on Mistral 7B is the new flagship 7B Hermes! Hermes 2 Pro is an upgraded, retrained ver...',
        passthroughEnabled: true
    },
    'cf_baaibge_base_en_v15': {
        id: 'cf_baaibge_base_en_v15',
        name: '@cf/baai/bge-base-en-v1.5',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/baai/bge-base-en-v1.5',
        description: 'BAAI general embedding (Base) model that transforms any given text into a 768-dimensional vector',
        passthroughEnabled: true
    },
    'cf_aisingaporegemma_sea_lion_v4_27b_it': {
        id: 'cf_aisingaporegemma_sea_lion_v4_27b_it',
        name: '@cf/aisingapore/gemma-sea-lion-v4-27b-it',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/aisingapore/gemma-sea-lion-v4-27b-it',
        description: 'SEA-LION stands for Southeast Asian Languages In One Network, which is a collection of Large Languag...',
        passthroughEnabled: true
    },
    'cf_qwenqwen3_30b_a3b_fp8': {
        id: 'cf_qwenqwen3_30b_a3b_fp8',
        name: '@cf/qwen/qwen3-30b-a3b-fp8',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwen3-30b-a3b-fp8',
        description: 'Qwen3 is the latest generation of large language models in Qwen series, offering a comprehensive sui...',
        passthroughEnabled: true
    },
    'cf_metallama_31_8b_instruct_awq': {
        id: 'cf_metallama_31_8b_instruct_awq',
        name: '@cf/meta/llama-3.1-8b-instruct-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3.1-8b-instruct-awq',
        description: 'Quantized (int4) generative text model with 8 billion parameters from Meta.',
        passthroughEnabled: true
    },
    'cf_unumuform_gen2_qwen_500m': {
        id: 'cf_unumuform_gen2_qwen_500m',
        name: '@cf/unum/uform-gen2-qwen-500m',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/unum/uform-gen2-qwen-500m',
        description: 'UForm-Gen is a small generative vision-language model primarily designed for Image Captioning and Vi...',
        passthroughEnabled: true
    },
    'cf_black_forest_labsflux_2_dev': {
        id: 'cf_black_forest_labsflux_2_dev',
        name: '@cf/black-forest-labs/flux-2-dev',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/black-forest-labs/flux-2-dev',
        description: 'FLUX.2 [dev] is an image model from Black Forest Labs where you can generate highly realistic and de...',
        passthroughEnabled: true
    },
    'cf_hf_theblokezephyr_7b_beta_awq': {
        id: 'cf_hf_theblokezephyr_7b_beta_awq',
        name: '@hf/thebloke/zephyr-7b-beta-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/thebloke/zephyr-7b-beta-awq',
        description: 'Zephyr 7B Beta AWQ is an efficient, accurate and blazing-fast low-bit weight quantized Zephyr model ...',
        passthroughEnabled: true
    },
    'cf_googlegemma_7b_it_lora': {
        id: 'cf_googlegemma_7b_it_lora',
        name: '@cf/google/gemma-7b-it-lora',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/google/gemma-7b-it-lora',
        description: 'This is a Gemma-7B base model that Cloudflare dedicates for inference with LoRA adapters. Gemma is...',
        passthroughEnabled: true
    },
    'cf_qwenqwen15_18b_chat': {
        id: 'cf_qwenqwen15_18b_chat',
        name: '@cf/qwen/qwen1.5-1.8b-chat',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwen1.5-1.8b-chat',
        description: 'Qwen1.5 is the improved version of Qwen, the large language model series developed by Alibaba Cloud.',
        passthroughEnabled: true
    },
    'cf_mistralaimistral_small_31_24b_instruct': {
        id: 'cf_mistralaimistral_small_31_24b_instruct',
        name: '@cf/mistralai/mistral-small-3.1-24b-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/mistralai/mistral-small-3.1-24b-instruct',
        description: 'Building upon Mistral Small 3 (2501), Mistral Small 3.1 (2503) adds state-of-the-art vision understa...',
        passthroughEnabled: true
    },
    'cf_metallama_3_8b_instruct_awq': {
        id: 'cf_metallama_3_8b_instruct_awq',
        name: '@cf/meta/llama-3-8b-instruct-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3-8b-instruct-awq',
        description: 'Quantized (int4) generative text model with 8 billion parameters from Meta.',
        passthroughEnabled: true
    },
    'cf_metallama_32_11b_vision_instruct': {
        id: 'cf_metallama_32_11b_vision_instruct',
        name: '@cf/meta/llama-3.2-11b-vision-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-3.2-11b-vision-instruct',
        description: 'The Llama 3.2-Vision instruction-tuned models are optimized for visual recognition, image reasoning...',
        passthroughEnabled: true
    },
    'cf_openaiwhisper_tiny_en': {
        id: 'cf_openaiwhisper_tiny_en',
        name: '@cf/openai/whisper-tiny-en',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/openai/whisper-tiny-en',
        description: 'Whisper is a pre-trained model for automatic speech recognition (ASR) and speech translation. Traine...',
        passthroughEnabled: true
    },
    'cf_openaiwhisper_large_v3_turbo': {
        id: 'cf_openaiwhisper_large_v3_turbo',
        name: '@cf/openai/whisper-large-v3-turbo',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/openai/whisper-large-v3-turbo',
        description: 'Whisper is a pre-trained model for automatic speech recognition (ASR) and speech translation.',
        passthroughEnabled: true
    },
    'cf_deepgramaura_1': {
        id: 'cf_deepgramaura_1',
        name: '@cf/deepgram/aura-1',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/deepgram/aura-1',
        description: 'Aura is a context-aware text-to-speech (TTS) model that applies natural pacing, expressiveness, and ...',
        passthroughEnabled: true
    },
    'cf_defogsqlcoder_7b_2': {
        id: 'cf_defogsqlcoder_7b_2',
        name: '@cf/defog/sqlcoder-7b-2',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/defog/sqlcoder-7b-2',
        description: 'This model is intended to be used by non-technical users to understand data inside their SQL databas...',
        passthroughEnabled: true
    },
    'cf_microsoftphi_2': {
        id: 'cf_microsoftphi_2',
        name: '@cf/microsoft/phi-2',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/microsoft/phi-2',
        description: 'Phi-2 is a Transformer-based model with a next-word prediction objective, trained on 1.4T tokens fro...',
        passthroughEnabled: true
    },
    'cf_facebookbart_large_cnn': {
        id: 'cf_facebookbart_large_cnn',
        name: '@cf/facebook/bart-large-cnn',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/facebook/bart-large-cnn',
        description: 'BART is a transformer encoder-encoder (seq2seq) model with a bidirectional (BERT-like) encoder and a...',
        passthroughEnabled: true
    },
    'cf_runwaymlstable_diffusion_v1_5_img2img': {
        id: 'cf_runwaymlstable_diffusion_v1_5_img2img',
        name: '@cf/runwayml/stable-diffusion-v1-5-img2img',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/runwayml/stable-diffusion-v1-5-img2img',
        description: 'Stable Diffusion is a latent text-to-image diffusion model capable of generating photo-realistic ima...',
        passthroughEnabled: true
    },
    'cf_openaigpt_oss_20b': {
        id: 'cf_openaigpt_oss_20b',
        name: '@cf/openai/gpt-oss-20b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/openai/gpt-oss-20b',
        description: 'OpenAI',
        passthroughEnabled: true
    },
    'cf_googleembeddinggemma_300m': {
        id: 'cf_googleembeddinggemma_300m',
        name: '@cf/google/embeddinggemma-300m',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/google/embeddinggemma-300m',
        description: 'EmbeddingGemma is a 300M parameter, state-of-the-art for its size, open embedding model from Google,...',
        passthroughEnabled: true
    },
    'cf_baaibge_reranker_base': {
        id: 'cf_baaibge_reranker_base',
        name: '@cf/baai/bge-reranker-base',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/baai/bge-reranker-base',
        description: 'Different from embedding model, reranker uses question and document as input and directly output sim...',
        passthroughEnabled: true
    },
    'cf_hf_googlegemma_7b_it': {
        id: 'cf_hf_googlegemma_7b_it',
        name: '@hf/google/gemma-7b-it',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@hf/google/gemma-7b-it',
        description: 'Gemma is a family of lightweight, state-of-the-art open models from Google, built from the same rese...',
        passthroughEnabled: true
    },
    'cf_leonardolucid_origin': {
        id: 'cf_leonardolucid_origin',
        name: '@cf/leonardo/lucid-origin',
        serviceType: 'CLOUDFLARE',
        taskType: 'IMAGE',
        modelId: '@cf/leonardo/lucid-origin',
        description: 'Lucid Origin from Leonardo.AI is their most adaptable and prompt-responsive model to date. Whether y...',
        passthroughEnabled: true
    },
    'cf_qwenqwen15_14b_chat_awq': {
        id: 'cf_qwenqwen15_14b_chat_awq',
        name: '@cf/qwen/qwen1.5-14b-chat-awq',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwen1.5-14b-chat-awq',
        description: 'Qwen1.5 is the improved version of Qwen, the large language model series developed by Alibaba Cloud....',
        passthroughEnabled: true
    },
    'cf_openchatopenchat_35_0106': {
        id: 'cf_openchatopenchat_35_0106',
        name: '@cf/openchat/openchat-3.5-0106',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/openchat/openchat-3.5-0106',
        description: 'OpenChat is an innovative library of open-source language models, fine-tuned with C-RLFT - a strateg...',
        passthroughEnabled: true
    },
    'cf_metallama_4_scout_17b_16e_instruct': {
        id: 'cf_metallama_4_scout_17b_16e_instruct',
        name: '@cf/meta/llama-4-scout-17b-16e-instruct',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/meta/llama-4-scout-17b-16e-instruct',
        description: 'Meta\'s Llama 4 Scout is a 17 billion parameter model with 16 experts that is natively multimodal. Th...',
        passthroughEnabled: true
    },
    'cf_googlegemma_3_12b_it': {
        id: 'cf_googlegemma_3_12b_it',
        name: '@cf/google/gemma-3-12b-it',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/google/gemma-3-12b-it',
        description: 'Gemma 3 models are well-suited for a variety of text generation and image understanding tasks, inclu...',
        passthroughEnabled: true
    },
    'cf_qwenqwq_32b': {
        id: 'cf_qwenqwq_32b',
        name: '@cf/qwen/qwq-32b',
        serviceType: 'CLOUDFLARE',
        taskType: 'TEXT',
        modelId: '@cf/qwen/qwq-32b',
        description: 'QwQ is the reasoning model of the Qwen series. Compared with conventional instruction-tuned models, ...',
        passthroughEnabled: true
    },
    'cf_baaibge_large_en_v15': {
        id: 'cf_baaibge_large_en_v15',
        name: '@cf/baai/bge-large-en-v1.5',
        serviceType: 'CLOUDFLARE',
        taskType: 'EMBEDDING',
        modelId: '@cf/baai/bge-large-en-v1.5',
        description: 'BAAI general embedding (Large) model that transforms any given text into a 1024-dimensional vector',
        passthroughEnabled: true
    },
    'cf_deepgramaura_2_en': {
        id: 'cf_deepgramaura_2_en',
        name: '@cf/deepgram/aura-2-en',
        serviceType: 'CLOUDFLARE',
        taskType: 'AUDIO',
        modelId: '@cf/deepgram/aura-2-en',
        description: 'Aura-2 is a context-aware text-to-speech (TTS) model that applies natural pacing, expressiveness, an...',
        passthroughEnabled: true
    }
};
