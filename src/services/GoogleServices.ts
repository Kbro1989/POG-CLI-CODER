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

/**
 * GoogleServices - Unified Google API Substrate
 */
export class GoogleServices {
    protected readonly config: GoogleServiceConfig;

    constructor(config: GoogleServiceConfig) {
        this.config = config;
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
