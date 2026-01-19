import { StaticModelRegistry, CatalogMetadata } from './StaticModelRegistry.js';

export { CatalogMetadata };

export type AIServiceType = 'GEMINI' | 'VERTEX_AI' | 'CLOUD_VISION' | 'DOCUMENT_AI' | 'SPEECH' | 'GEOSPATIAL' | 'HEALTH_AI' | 'MEDIA_FORGE' | 'GUTENBERG' | 'VIDEO_INTELLIGENCE' | 'TRANSLATION' | 'NATURAL_LANGUAGE';

export type AITaskType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'MULTIMODAL' | 'EMBEDDING' | 'HEALTH' | 'GEO';

export interface AICapability {
    readonly id: string;
    readonly name: string;
    readonly serviceType: AIServiceType;
    readonly taskType: AITaskType;
    readonly modelId?: string;
    readonly description: string;
    readonly passthroughEnabled: boolean;
}

export const CapabilityRegistry: Record<string, AICapability> = {
    'face_detection': {
        id: 'face_detection',
        name: 'Vision API Face Detection',
        serviceType: 'CLOUD_VISION',
        taskType: 'IMAGE',
        description: 'Detect faces and landmark features in images.',
        passthroughEnabled: true
    },
    'ocr_document': {
        id: 'ocr_document',
        name: 'Document AI OCR',
        serviceType: 'DOCUMENT_AI',
        taskType: 'IMAGE',
        modelId: 'OCR_PROCESSOR',
        description: 'Transform document images into structured, machine-readable text.',
        passthroughEnabled: true
    },
    'pathology_analysis': {
        id: 'pathology_analysis',
        name: 'Vertex AI Pathology',
        serviceType: 'HEALTH_AI',
        taskType: 'HEALTH',
        modelId: 'path-foundation',
        description: 'Analyze pathology slices using foundation medical models.',
        passthroughEnabled: true
    },
    'video_action_recognition': {
        id: 'video_action_recognition',
        name: 'MoViNet Action Recognition',
        serviceType: 'VERTEX_AI',
        taskType: 'VIDEO',
        modelId: 'movinet',
        description: 'Detect and classify actions in streaming or batch video.',
        passthroughEnabled: true
    },
    'speech_to_text_chirp': {
        id: 'speech_to_text_chirp',
        name: 'Chirp 3 Multilingual ASR',
        serviceType: 'SPEECH',
        taskType: 'AUDIO',
        modelId: 'chirp-3',
        description: 'Universal speech transcription with Google\'s most advanced ASR model.',
        passthroughEnabled: true
    },
    'geospatial_imagery_classification': {
        id: 'geospatial_imagery_classification',
        name: 'Geospatial Remote Sensing',
        serviceType: 'GEOSPATIAL',
        taskType: 'GEO',
        modelId: 'imagery-classification',
        description: 'Classify and retrieve aerial/satellite imagery.',
        passthroughEnabled: true
    },
    'form_parsing': {
        id: 'form_parsing',
        name: 'Document AI Form Parser',
        serviceType: 'DOCUMENT_AI',
        taskType: 'IMAGE',
        modelId: 'FORM_PARSER_PROCESSOR',
        description: 'Extract key-value pairs and tables from structured documents.',
        passthroughEnabled: true
    },
    // WebApp Forge (Creative)
    'webapp_build_stack': {
        id: 'scaffold_project',
        name: 'Scaffold Web App',
        serviceType: 'GEMINI',
        taskType: 'TEXT',
        description: 'Create full-stack project structures (React, Next.js, etc) with boilerplate.',
        passthroughEnabled: false
    },
    'webapp_db_setup': {
        id: 'setup_database',
        name: 'Setup Database',
        serviceType: 'GEMINI',
        taskType: 'TEXT',
        description: 'Initialize local databases (SQLite) for web apps.',
        passthroughEnabled: false
    },
    'webapp_preview': {
        id: 'start_preview_server',
        name: 'Start Preview Server',
        serviceType: 'GEMINI',
        taskType: 'TEXT',
        description: 'Launch and manage local dev servers for previewing web apps.',
        passthroughEnabled: false
    },
    // Esoteric Media Forge
    'imagen_v4_generation': {
        id: 'imagen_v4_generation',
        name: 'Imagen 4 Pro',
        serviceType: 'MEDIA_FORGE',
        taskType: 'IMAGE',
        modelId: 'imagen-4',
        description: 'Professional-grade image generation and editing.',
        passthroughEnabled: true
    },
    'veo_v3_video_generation': {
        id: 'veo_v3_video_generation',
        name: 'Veo 3.1 Fast',
        serviceType: 'MEDIA_FORGE',
        taskType: 'VIDEO',
        modelId: 'veo-3.1-fast',
        description: 'Generative video with audio from text or image prompts.',
        passthroughEnabled: true
    },
    'lyria_v2_music_generation': {
        id: 'lyria_v2_music_generation',
        name: 'Lyria 2 Music',
        serviceType: 'MEDIA_FORGE',
        taskType: 'AUDIO',
        modelId: 'lyria-2',
        description: 'Latent text-to-audio diffusion for high-quality instrumental music.',
        passthroughEnabled: true
    },
    // Esoteric Bio Intelligence
    'hear_acoustic_analysis': {
        id: 'hear_acoustic_analysis',
        name: 'HeAR Health Acoustics',
        serviceType: 'HEALTH_AI',
        taskType: 'AUDIO',
        modelId: 'hear-v1',
        description: 'Generate embeddings for health-related sounds (coughs, breathing).',
        passthroughEnabled: true
    },
    'medgemma_reasoning': {
        id: 'medgemma_reasoning',
        name: 'MedGemma 1.5',
        serviceType: 'HEALTH_AI',
        taskType: 'TEXT',
        modelId: 'medgemma-1.5',
        description: 'Specialized medical reasoning and comprehension.',
        passthroughEnabled: true
    },
    'derm_foundation_analysis': {
        id: 'derm_foundation_analysis',
        name: 'Derm Foundation',
        serviceType: 'HEALTH_AI',
        taskType: 'IMAGE',
        modelId: 'derm-foundation',
        description: 'Classify medical photographs of human skin.',
        passthroughEnabled: true
    },
    // Knowledge Base (Phase 20)
    'gutenberg_search': {
        id: 'gutenberg_search',
        name: 'Project Gutenberg Search',
        serviceType: 'GUTENBERG',
        taskType: 'TEXT',
        description: 'Search or retrieve 60k+ books by domain, author, or topic.',
        passthroughEnabled: true
    },
    'gutenberg_ingest': {
        id: 'gutenberg_ingest',
        name: 'Gutenberg Corpus Ingestion',
        serviceType: 'GUTENBERG',
        taskType: 'TEXT',
        description: 'Download and cache books for local knowledge base.',
        passthroughEnabled: true
    },
    'gutenberg_styles': {
        id: 'gutenberg_styles',
        name: 'Author Style Catalog',
        serviceType: 'GUTENBERG',
        taskType: 'TEXT',
        description: 'List available author styles for storytelling.',
        passthroughEnabled: true
    },
    ...StaticModelRegistry
}


export function registerCapability(cap: AICapability): void {
    if (CapabilityRegistry[cap.id]) {
        return; // Don't overwrite hardcoded ones
    }
    CapabilityRegistry[cap.id] = cap;
}
