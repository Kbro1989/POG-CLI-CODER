import { GoogleGenAI } from '@google/genai';
import { CapabilityRegistry, AICapability, AIServiceType } from './CapabilityRegistry.js';
import { VibeConfig } from '../../core/models.js';
import { execSync } from 'child_process';
import pino from 'pino';

const logger = pino({
    name: 'AIDispatcher',
    level: process.env['VIBE_LOG_LEVEL'] || 'info'
});

export type ServiceState = 'IDLE' | 'CONNECTING' | 'READY' | 'ERROR';

export interface DispatchPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string; // Base64
    };
    fileData?: {
        mimeType: string;
        fileUri: string;
    };
}

export interface DispatchRequest {
    readonly capabilityId: string;
    readonly payload: string | DispatchPart[];
    readonly modelOverride?: string;
}

export interface DispatchResponse {
    readonly success: boolean;
    readonly result: any;
    readonly error?: string;
    readonly serviceUsed: AIServiceType | 'NONE';
    readonly state: ServiceState;
}

export class AIDispatcher {
    private genAI: GoogleGenAI | null = null;
    private serviceStates: Map<AIServiceType, ServiceState> = new Map();
    private refreshTimeout: NodeJS.Timeout | null = null;

    constructor(private config: VibeConfig) {
        const apiKey = process.env['GOOGLE_API_KEY'];
        if (apiKey) {
            this.genAI = new GoogleGenAI({ apiKey });
            this.setServiceState('GEMINI', 'READY');
        } else {
            this.setServiceState('GEMINI', 'ERROR');
        }

        // Initialize other services
        const types: AIServiceType[] = ['VERTEX_AI', 'CLOUD_VISION', 'DOCUMENT_AI', 'SPEECH', 'GEOSPATIAL', 'HEALTH_AI', 'MEDIA_FORGE', 'VIDEO_INTELLIGENCE', 'TRANSLATION', 'NATURAL_LANGUAGE'];
        types.forEach(t => this.serviceStates.set(t, apiKey ? 'READY' : 'IDLE'));
    }

    private setServiceState(type: AIServiceType, state: ServiceState): void {
        this.serviceStates.set(type, state);
        logger.debug({ type, state }, 'Service state transition');
    }

    public getServiceStatus(type: AIServiceType): ServiceState {
        return this.serviceStates.get(type) || 'IDLE';
    }

    /**
     * Coalesced Refresh - Debounces multiple capability updates
     * (Google Golden Standard: Prevention of race conditions during discovery)
     */
    public async refreshCapabilities(): Promise<void> {
        if (this.refreshTimeout) clearTimeout(this.refreshTimeout);

        return new Promise((resolve) => {
            this.refreshTimeout = setTimeout(async () => {
                logger.info('Performing coalesced capability refresh');
                // In a real MCP setup, this would poll connected servers
                // For now, it pulses the registry
                this.refreshTimeout = null;
                resolve();
            }, 500);
        });
    }

    async dispatch(request: DispatchRequest): Promise<DispatchResponse> {
        const capability = CapabilityRegistry[request.capabilityId];
        if (!capability) {
            return {
                success: false,
                result: null,
                error: `Unknown capability: ${request.capabilityId} `,
                serviceUsed: 'NONE',
                state: 'ERROR'
            };
        }

        const isEnabled = this.config.enabledServices.includes(capability.serviceType.toLowerCase()) ||
            (capability.serviceType === 'MEDIA_FORGE' && this.config.enabledServices.includes('mediaforge'));

        if (!isEnabled) {
            return {
                success: false,
                result: null,
                error: `Service[${capability.serviceType}] is disabled.`,
                serviceUsed: capability.serviceType,
                state: 'ERROR'
            };
        }

        const currentState = this.getServiceStatus(capability.serviceType);
        logger.info({ capabilityId: request.capabilityId, state: currentState }, 'Dispatching AI task');

        try {
            switch (capability.serviceType) {
                case 'GEMINI':
                    return await this.handleGemini(capability, request);
                case 'VERTEX_AI':
                case 'HEALTH_AI':
                case 'GEOSPATIAL':
                case 'MEDIA_FORGE':
                case 'VIDEO_INTELLIGENCE':
                case 'TRANSLATION':
                case 'NATURAL_LANGUAGE':
                    return await this.handleVertex(capability, request);
                default:
                    return await this.handleSpecializedCloud(capability, request);
            }
        } catch (error) {
            this.setServiceState(capability.serviceType, 'ERROR');
            return {
                success: false,
                result: null,
                error: (error as Error).message,
                serviceUsed: capability.serviceType,
                state: 'ERROR'
            };
        }
    }

    private async handleGemini(capability: AICapability, request: DispatchRequest): Promise<DispatchResponse> {
        if (!this.genAI) throw new Error('Gemini API key not configured');

        this.setServiceState('GEMINI', 'CONNECTING');
        const modelId = request.modelOverride || capability.modelId || 'gemini-2.0-flash';

        const contents = Array.isArray(request.payload)
            ? [{ role: 'user', parts: request.payload as any }]
            : [{ role: 'user', parts: [{ text: request.payload }] }];

        const result = await (this.genAI.models as any).generateContent({
            model: modelId,
            contents
        });

        this.setServiceState('GEMINI', 'READY');
        return {
            success: true,
            result: result.text,
            serviceUsed: 'GEMINI',
            state: 'READY'
        };
    }

    private getAccessToken(): string {
        try {
            return execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
        } catch (e) {
            logger.warn('Failed to retrieve gcloud access token. Ensure gcloud is installed and authenticated.');
            return process.env['GOOGLE_API_KEY'] || '';
        }
    }

    private getProjectId(): string {
        try {
            const project = execSync('gcloud config get-value project', { encoding: 'utf-8' }).trim();
            return (project === '(unset)' || !project) ? (process.env['GOOGLE_CLOUD_PROJECT'] || 'pog-vibe-core') : project;
        } catch (e) {
            return process.env['GOOGLE_CLOUD_PROJECT'] || 'pog-vibe-core';
        }
    }

    private async handleVertex(capability: AICapability, request: DispatchRequest): Promise<DispatchResponse> {
        this.setServiceState(capability.serviceType, 'CONNECTING');
        const token = this.getAccessToken();
        const projectId = this.getProjectId();
        const modelId = request.modelOverride || capability.modelId;

        try {
            const region = 'us-central1'; // Default region
            const endpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${modelId}:predict`;

            logger.info({ endpoint, modelId, projectId }, 'Executing Real Vertex AI REST Call');

            const instances = Array.isArray(request.payload)
                ? request.payload.map(p => ({
                    content: p.text || '',
                    mimeType: p.inlineData?.mimeType,
                    data: p.inlineData?.data
                }))
                : [{ prompt: request.payload }];

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    instances,
                    parameters: {
                        temperature: 0.7,
                        maxOutputTokens: 1024,
                        topP: 0.95,
                        topK: 40
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Vertex AI API Error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            this.setServiceState(capability.serviceType, 'READY');

            return {
                success: true,
                result: data,
                serviceUsed: capability.serviceType,
                state: 'READY'
            };
        } catch (error) {
            this.setServiceState(capability.serviceType, 'ERROR');
            throw error;
        }
    }

    private async handleSpecializedCloud(capability: AICapability, _request: DispatchRequest): Promise<DispatchResponse> {
        this.setServiceState(capability.serviceType, 'ERROR');
        const errorMsg = `Specialized SDK for [${capability.serviceType}] not installed.`;
        return {
            success: false,
            result: null,
            error: errorMsg,
            serviceUsed: capability.serviceType,
            state: 'ERROR'
        };
    }
}

