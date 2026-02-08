import pino from 'pino';
import { Result } from '../core/models.js';

const logger = pino({
    name: 'GoogleServices',
    base: { hostname: 'POG-VIBE' }
});

export interface GoogleServiceConfig {
    apiKey: string;
    projectId?: string;
    region?: string;
}

import { ImageAnnotatorClient } from '@google-cloud/vision';
import { v2 } from '@google-cloud/translate';
const { Translate } = v2;
import { LanguageServiceClient } from '@google-cloud/language';

/**
 * GoogleServices - Unified Google API Substrate
 */
export class GoogleServices {
    protected readonly config: GoogleServiceConfig;
    private visionClient?: ImageAnnotatorClient;
    private translateClient?: any; // v2.Translate
    private nlClient?: LanguageServiceClient;

    constructor(config: GoogleServiceConfig) {
        this.config = config;

        const authOptions = config.apiKey ? { apiKey: config.apiKey } : {};

        try {
            this.visionClient = new ImageAnnotatorClient(authOptions);
            this.translateClient = new Translate(authOptions);
            this.nlClient = new LanguageServiceClient(authOptions);
        } catch (e) {
            logger.warn({ error: (e as Error).message }, 'Failed to initialize GCloud Sensory Clients - Fallback active');
        }
    }

    /**
     * Standardized error classification for Google APIs
     */
    protected classifyError(error: any): { isQuota: boolean; isAuth: boolean; message: string } {
        const message = error.message || String(error);
        const lowerMessage = message.toLowerCase();

        return {
            isQuota: lowerMessage.includes('429') || lowerMessage.includes('quota'),
            isAuth: lowerMessage.includes('401') || lowerMessage.includes('403') || lowerMessage.includes('unauthorized'),
            message
        };
    }

    /**
     * Analyze image using Google Vision API
     */
    async analyzeImage(buffer: Buffer): Promise<Result<any>> {
        if (!this.visionClient) return { ok: false, error: new Error('Vision Client not initialized') };

        try {
            const [result] = await this.visionClient.annotateImage({
                image: { content: buffer },
                features: [
                    { type: 'TEXT_DETECTION' },
                    { type: 'LABEL_DETECTION' },
                    { type: 'OBJECT_LOCALIZATION' }
                ]
            });
            return { ok: true, value: result };
        } catch (error) {
            logger.error({ error }, 'Vision API call failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Translate text using Google Translation API
     */
    async translateText(text: string, target: string): Promise<Result<string>> {
        if (!this.translateClient) return { ok: false, error: new Error('Translate Client not initialized') };

        try {
            const [translation] = await this.translateClient.translate(text, target);
            return { ok: true, value: translation };
        } catch (error) {
            logger.error({ error }, 'Translation API call failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Analyze entities using Google Natural Language API
     */
    async analyzeEntities(text: string): Promise<Result<any>> {
        if (!this.nlClient) return { ok: false, error: new Error('NL Client not initialized') };

        try {
            const [result] = await this.nlClient.analyzeEntities({
                document: {
                    content: text,
                    type: 'PLAIN_TEXT'
                }
            });
            return { ok: true, value: result };
        } catch (error) {
            logger.error({ error }, 'Natural Language API call failed');
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Placeholder for future cross-service Google discovery
     */
    async auditAbilities(): Promise<Result<{ services: string[] }>> {
        try {
            logger.info('Auditing Google services abilities via environment...');
            const services: string[] = [];

            // 1. Storage & CloudBuild rely on Application Credentials
            if (process.env['GOOGLE_APPLICATION_CREDENTIALS']) {
                services.push('storage', 'cloudbuild', 'pubsub');
            }

            // 2. Generative Language (Gemini) relies on API Key
            if (this.config.apiKey) {
                services.push('generativelanguage');
            }

            // 3. Region awareness
            if (this.config.region) {
                services.push(`region:${this.config.region}`);
            }

            return { ok: true, value: { services } };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }
}
