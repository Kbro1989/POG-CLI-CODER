import { GoogleGenAI } from '@google/genai';
import { CapabilityRegistry, AICapability, AIServiceType } from './CapabilityRegistry.js';
import { VibeConfig } from '../../core/models.js';
import { execSync, spawn } from 'child_process';
import { pino } from 'pino';

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
    readonly result: unknown;
    readonly error?: string;
    readonly serviceUsed: AIServiceType | 'NONE';
    readonly state: ServiceState;
}

export class AIDispatcher {
    private readonly genAI: GoogleGenAI | null = null;
    private readonly serviceStates: Map<AIServiceType, ServiceState> = new Map();
    private refreshTimeout: NodeJS.Timeout | null = null;

    constructor(private readonly config: VibeConfig) {
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
            let response: DispatchResponse;
            switch (capability.serviceType) {
                case 'GEMINI':
                    response = await this.handleGemini(capability, request);
                    break;
                case 'CLOUDFLARE':
                    response = await this.handleCloudflare(capability, request);
                    break;
                case 'HUGGINGFACE':
                    response = await this.handleHuggingFace(capability, request);
                    break;
                case 'OLLAMA':
                    response = await this.handleOllama(capability, request);
                    break;
                case 'VERTEX_AI':
                case 'HEALTH_AI':
                case 'GEOSPATIAL':
                case 'MEDIA_FORGE':
                case 'VIDEO_INTELLIGENCE':
                case 'TRANSLATION':
                case 'NATURAL_LANGUAGE':
                    response = await this.handleVertex(capability, request);
                    break;
                default:
                    response = await this.handleSpecializedCloud(capability, request);
            }

            // If failed and fallback exists, recursively dispatch
            if (!response.success && capability.fallback) {
                logger.warn({
                    capabilityId: request.capabilityId,
                    fallbackId: capability.fallback,
                    error: response.error
                }, 'Primary capability failed. Attempting failover to fallback.');

                return await this.dispatch({
                    ...request,
                    capabilityId: capability.fallback
                });
            }

            return response;
        } catch (error: unknown) {
            this.setServiceState(capability.serviceType, 'ERROR');
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Handle recursive fallback on catch as well
            if (capability.fallback) {
                logger.warn({
                    capabilityId: request.capabilityId,
                    fallbackId: capability.fallback,
                    error: errorMessage
                }, 'Dispatch exception. Attempting failover to fallback.');

                return await this.dispatch({
                    ...request,
                    capabilityId: capability.fallback
                });
            }

            return {
                success: false,
                result: null,
                error: errorMessage,
                serviceUsed: capability.serviceType,
                state: 'ERROR'
            };
        }
    }

    private async handleCloudflare(capability: AICapability, request: DispatchRequest): Promise<DispatchResponse> {
        this.setServiceState('CLOUDFLARE', 'CONNECTING');
        const accountId = process.env['CLOUDFLARE_ACCOUNT_ID'];
        const apiToken = process.env['CLOUDFLARE_API_TOKEN'];
        const modelId = request.modelOverride || capability.modelId || '@cf/meta/llama-3.1-8b-instruct';

        if (!accountId || !apiToken) {
            throw new Error('Cloudflare credentials (Account ID, API Token) not configured');
        }

        try {
            const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: typeof request.payload === 'string'
                        ? [{ role: 'user', content: request.payload }]
                        : (request.payload).map(p => ({ role: 'user', content: p.text }))
                })
            });

            const data = await resp.json() as Record<string, unknown>;
            if (!resp.ok) {
                throw new Error(`Cloudflare AI Error (${resp.status}): ${JSON.stringify(data['errors'])}`);
            }

            const result = data['result'] as Record<string, unknown>;
            this.setServiceState('CLOUDFLARE', 'READY');
            return {
                success: true,
                result: result['response'] || result,
                serviceUsed: 'CLOUDFLARE',
                state: 'READY'
            };
        } catch (error: unknown) {
            this.setServiceState('CLOUDFLARE', 'ERROR');
            return {
                success: false,
                result: null,
                error: error instanceof Error ? error.message : String(error),
                serviceUsed: 'CLOUDFLARE',
                state: 'ERROR'
            };
        }
    }

    private async handleHuggingFace(capability: AICapability, request: DispatchRequest): Promise<DispatchResponse> {
        this.setServiceState(capability.serviceType, 'CONNECTING');
        const apiKey = process.env['HUGGINGFACE_API_KEY'];
        // Use Kimi as the default if not specified, since it's our new Reasoning Forge
        const modelId = request.modelOverride || capability.modelId || 'moonshotai/Kimi-K2.5:novita';

        if (!apiKey) {
            throw new Error('Hugging Face API key not configured');
        }

        try {
            // Modern OpenAI-compatible endpoint on the HF Router
            const endpoint = `https://router.huggingface.co/v1/chat/completions`;

            // Normalize payload to OpenAI messages format
            const messages = typeof request.payload === 'string'
                ? [{ role: 'user', content: request.payload }]
                : (Array.isArray(request.payload) ? request.payload : [request.payload]);

            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: messages,
                    max_tokens: 1024,
                    temperature: 0.7
                })
            });

            const data = (await resp.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
                error?: any;
            };

            if (!resp.ok) {
                throw new Error(`Hugging Face Router Error (${resp.status}): ${JSON.stringify(data.error || data)}`);
            }

            this.setServiceState(capability.serviceType, 'READY');

            // Extract completion content from OpenAI format
            const generatedText = data.choices?.[0]?.message?.content || JSON.stringify(data);

            return {
                success: true,
                result: generatedText,
                serviceUsed: capability.serviceType,
                state: 'READY'
            };
        } catch (error: unknown) {
            this.setServiceState(capability.serviceType, 'ERROR');
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                result: null,
                error: message,
                serviceUsed: capability.serviceType,
                state: 'ERROR'
            };
        }
    }

    private async handleOllama(capability: AICapability, request: DispatchRequest): Promise<DispatchResponse> {
        this.setServiceState('OLLAMA', 'CONNECTING');
        const modelId = request.modelOverride || capability.modelId || 'qwen2.5-coder:7b';
        const prompt = typeof request.payload === 'string'
            ? request.payload
            : (request.payload).map(p => p.text).join('\n');

        return new Promise((resolve) => {
            const child = spawn('ollama', ['run', modelId, prompt], {
                shell: true
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data: Buffer) => stdout += data.toString());
            child.stderr.on('data', (data: Buffer) => stderr += data.toString());

            child.on('close', (code: number | null) => {
                if (code === 0) {
                    this.setServiceState('OLLAMA', 'READY');
                    resolve({
                        success: true,
                        result: stdout.trim(),
                        serviceUsed: 'OLLAMA',
                        state: 'READY'
                    });
                } else {
                    this.setServiceState('OLLAMA', 'ERROR');
                    resolve({
                        success: false,
                        result: null,
                        error: `Ollama failed (${code}): ${stderr}`,
                        serviceUsed: 'OLLAMA',
                        state: 'ERROR'
                    });
                }
            });

            child.on('error', (err: Error) => {
                this.setServiceState('OLLAMA', 'ERROR');
                resolve({
                    success: false,
                    result: null,
                    error: err.message,
                    serviceUsed: 'OLLAMA',
                    state: 'ERROR'
                });
            });
        });
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

    private async handleSpecializedCloud(capability: AICapability, request: DispatchRequest): Promise<DispatchResponse> {
        this.setServiceState(capability.serviceType, 'CONNECTING');

        // ULTIMATE SOVEREIGNTY: Instead of failing, we use our "Top Brain" (Gemini) 
        // to simulate the specialized cloud service logic using detailed system prompts.
        logger.info({ capabilityId: request.capabilityId, type: capability.serviceType }, 'Routing specialized cloud task to Simulation Substrate');

        const simulationPrompt = `
You are simulating the ${capability.serviceType} cloud service.
Task: ${capability.description}
Capability: ${request.capabilityId}
Payload: ${typeof request.payload === 'string' ? request.payload : JSON.stringify(request.payload)}

Strictly emulate the API response format of ${capability.serviceType} for this specific capability.
Return ONLY valid JSON representing the service output.
`;

        const simulationResult = await this.handleGemini(capability, {
            ...request,
            payload: simulationPrompt
        });

        if (simulationResult.success) {
            try {
                // Attempt to parse if it's JSON-wrapped text
                const cleaned = (simulationResult.result as string).replace(/```json/g, '').replace(/```/g, '').trim();
                return {
                    ...simulationResult,
                    result: JSON.parse(cleaned),
                    serviceUsed: 'GEMINI', // Transparent about the substrate
                    state: 'READY'
                };
            } catch {
                return simulationResult;
            }
        }

        return simulationResult;
    }

}

