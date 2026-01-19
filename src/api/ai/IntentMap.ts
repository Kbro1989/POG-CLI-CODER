/**
 * IntentMap.ts
 * 
 * Static registry for mapping User Intents to Capability IDs from CapabilityRegistry.
 * Derived from ai_tools_comprehensive_report.md Selection Matrix.
 */

export interface IntentPathway {
    id: string;
    description: string;
    targetCapabilityId: string;
    keywords: string[];
    reasoning: string;
}

export const IntentMap: Record<string, IntentPathway[]> = {
    IMAGING: [
        {
            id: 'marketing_text_images',
            description: 'Marketing materials with precise text rendering',
            targetCapabilityId: 'dynamic_dall-e_3', // Or Ideogram if available in registry
            keywords: ['marketing', 'text in image', 'tagline', 'typography', 'poster'],
            reasoning: 'DALL-E 3 and Ideogram are superior for text rendering in images.'
        },
        {
            id: 'artistic_concept_art',
            description: 'High-quality artistic concept art and mood boards',
            targetCapabilityId: 'dynamic_midjourney',
            keywords: ['artistic', 'concept art', 'mood board', 'cinematic', 'painting'],
            reasoning: 'Midjourney provides unmatched artistic quality and composition.'
        },
        {
            id: 'photorealistic_portraits',
            description: 'Highly realistic human portraits and photography',
            targetCapabilityId: 'dynamic_flux_1_dev', // Flux is noted for photorealism
            keywords: ['photorealistic', 'portrait', 'human', 'photography', 'real life'],
            reasoning: 'Flux is currently the benchmark for photorealistic human subjects.'
        }
    ],
    VIDEO: [
        {
            id: 'cinematic_quality',
            description: 'Maximum cinematic quality and physics simulation',
            targetCapabilityId: 'dynamic_sora_2',
            keywords: ['cinematic', 'movie', 'film', 'physics', 'high quality'],
            reasoning: 'Sora 2 leads in physics simulation and object permanence.'
        },
        {
            id: 'audio_synced_video',
            description: 'Video with native synchronized audio and sound effects',
            targetCapabilityId: 'dynamic_veo_3_1_for_video_generation',
            keywords: ['audio', 'sound', 'dialogue', 'sfx', 'ambience'],
            reasoning: 'Veo 3/3.1 is the only major platform with native synchronized audio generation.'
        },
        {
            id: 'professional_production',
            description: 'Iterative professional video production with camera control',
            targetCapabilityId: 'dynamic_runway_gen-4',
            keywords: ['production', 'camera control', 'motion brush', 'consistency'],
            reasoning: 'Runway provides the best professional tooling and character consistency.'
        }
    ],
    TRANSLATION: [
        {
            id: 'professional_translation',
            description: 'High-accuracy professional document translation (European)',
            targetCapabilityId: 'dynamic_deepl_translator',
            keywords: ['professional', 'translation', 'contract', 'accuracy', 'european'],
            reasoning: 'DeepL is the market leader for accuracy in European languages.'
        },
        {
            id: 'global_coverage',
            description: 'Quick translation covering 100+ languages',
            targetCapabilityId: 'dynamic_google_translate',
            keywords: ['global', 'coverage', 'all languages', 'quick', 'detect'],
            reasoning: 'Google Translate has the widest language support in the world.'
        }
    ],
    SPECIALIZED: [
        {
            id: 'clinical_radiology',
            description: 'Specialized clinical radiology and X-ray analysis',
            targetCapabilityId: 'dynamic_radiology_foundations',
            keywords: ['medical', 'radiology', 'x-ray', 'clinical', 'health'],
            reasoning: 'Specialized medical models outperform general LLMs in diagnostics.'
        },
        {
            id: 'geospatial_analysis',
            description: 'Satellite and geospatial air quality or solar analysis',
            targetCapabilityId: 'dynamic_air_quality_api',
            keywords: ['satellite', 'geospatial', 'air quality', 'solar', 'environment'],
            reasoning: 'Specialized APIs provide real-time environment data.'
        }
    ]
};
