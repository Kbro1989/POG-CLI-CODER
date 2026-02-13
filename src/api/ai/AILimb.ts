import { NeuralLimb, Intent, Execution, TernaryDecision } from '../../limbs/core/NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { FreeModelRouter } from '../../core/Router.js';
import { CapabilityRegistry, CatalogMetadata } from './CapabilityRegistry.js';
import { IntentMap } from './IntentMap.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import pino from 'pino';

const logger = pino({
    name: 'AILimb',
    base: { hostname: 'POG-VIBE' },
    level: process.env['VIBE_LOG_LEVEL'] || 'info'
});

interface MediaFile {
    mimeType: string;
    base64: string;
}

interface StepData {
    [key: string]: unknown;
}

interface MultiPathData {
    chainResults: StepData[];
}

export class AILimb implements NeuralLimb {
    id = 'ai_limb';
    type = 'analytical' as const;
    capabilities = Object.keys(CapabilityRegistry);

    private readonly catalog = {
        models: CapabilityRegistry,
        tasks: CatalogMetadata.tasks,
        providers: CatalogMetadata.providers
    };

    constructor(
        private readonly config: VibeConfig,
        private readonly modelExecutor: ModelExecutor,
        private readonly router: FreeModelRouter
    ) {
        logger.debug('AILimb initialized with ternary routing integration');
    }

    async canHandle(intent: Intent): Promise<TernaryDecision> {
        if (!this.config.enabledServices.includes('AI') && !this.config.enabledServices.includes('ai')) {
            return 'Yin';
        }

        const p = intent.prompt.toLowerCase();

        // 'Yang': Support for Meta-queries = optimal
        const metaKeywords = ['how many', 'list all', 'what is new', 'what\'s new', 'capabilities', 'supported providers', 'supported tasks'];
        if (metaKeywords.some(k => p.includes(k))) return 'Yang';

        // Check if any registry ID or description keywords are in the prompt
        const match = Object.values(CapabilityRegistry).some(cap => {
            const idMatch = p.includes(cap.id.replace(/_/g, ' '));
            const nameMatch = p.includes(cap.name.toLowerCase());
            return idMatch || nameMatch;
        });

        // 'YinYang': Registry matches = maybe
        return match ? 'YinYang' : 'Yin';
    }


    async execute(intent: Intent): Promise<Result<Execution>> {
        logger.info({ prompt: intent.prompt }, 'Executing AI specialized task');
        const p = intent.prompt.toLowerCase();

        // 1. Handle Meta-Queries First
        if (p.includes('how many') && p.includes('google')) {
            const count = Object.values(CapabilityRegistry).filter(c => c.name.toLowerCase().includes('google') || c.id.includes('gemini') || c.id.includes('google')).length;
            return { ok: true, value: { output: `There are ${count} Google models available in the baked-in catalog.`, data: { count } } };
        }
        if (p.includes('list all') && p.includes('providers')) {
            const list = Object.entries(this.catalog.providers).map(([prov, count]) => `${prov} (${count})`).join(', ');
            return { ok: true, value: { output: `Supported Providers: ${list}`, data: { providers: this.catalog.providers } } };
        }
        if (p.includes('how many') && p.includes('tasks')) {
            const count = Object.keys(this.catalog.tasks).length;
            return { ok: true, value: { output: `There are ${count} unique task types supported in the baked-in catalog.`, data: { count } } };
        }

        // 2. Handle Multi-Path Intents (Composite Chains)
        if (p.includes(' and then ') || p.includes(' followed by ')) {
            const steps = p.split(/ and then | followed by /);
            logger.info({ steps }, 'Detected Composite Intent Chain');
            const results: StepData[] = [];
            let cumulativeOutput = '';

            for (const step of steps) {
                const stepIntent: Intent = { ...intent, prompt: step.trim() };
                const stepResult = await this.executeSingleIntent(stepIntent);
                if (!stepResult.ok) return stepResult;

                const stepData = stepResult.value.data as StepData;
                results.push(stepData);
                cumulativeOutput += `\n--- Step: ${step.trim()} ---\n${stepResult.value.output}\n`;
            }

            const data: MultiPathData = { chainResults: results };
            return {
                ok: true,
                value: {
                    output: `Multi-Path Execution Completed:${cumulativeOutput}`,
                    data
                }
            };
        }

        return this.executeSingleIntent(intent);
    }

    private async executeSingleIntent(intent: Intent): Promise<Result<Execution>> {
        const p = intent.prompt.toLowerCase();
        const capabilityId = this.identifyCapability(intent.prompt);

        if (!capabilityId) {
            // Check for description search (Fuzzy model search)
            for (const cap of Object.values(CapabilityRegistry)) {
                if (p.includes(cap.name.toLowerCase())) return this.executeCapability(cap.id, intent.prompt);
            }

            return {
                ok: false,
                error: new Error('Could not map intent to a registered AI capability.')
            };
        }

        return this.executeCapability(capabilityId, intent.prompt);
    }

    private async executeCapability(capabilityId: string, prompt: string): Promise<Result<Execution>> {
        const capability = CapabilityRegistry[capabilityId];
        if (!capability) return { ok: false, error: new Error('Capability not found') };

        let payload: string | Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = prompt;

        // 1. Multimodal Orchestration
        if (capability.taskType === 'IMAGE' || capability.taskType === 'VIDEO') {
            const files = this.findMediaFiles(capability.taskType);
            if (files.length > 0) {
                logger.info({ count: files.length, type: capability.taskType }, 'Attaching media files to AI task');
                payload = [
                    { text: prompt },
                    ...files.map(f => ({
                        inlineData: {
                            mimeType: f.mimeType,
                            data: f.base64
                        }
                    }))
                ];
            }
        }

        logger.info({ capabilityId, serviceType: capability.serviceType }, 'Dispatching specialized AI task via ModelExecutor');

        let result: Result<unknown>;
        if (capability.serviceType === 'GEMINI' || capability.serviceType === 'VERTEX_AI') {
            let model = capability.modelId;
            if (!model) {
                const modelResult = await this.router.route(prompt);
                model = modelResult.ok ? modelResult.value : 'gemini-2.0-flash';
            }
            result = await this.modelExecutor.callModel(model, typeof payload === 'string' ? payload : JSON.stringify(payload));
        } else {
            const model = this.router.routeByAbility(capability.taskType as any);
            result = await this.modelExecutor.callCloudflareAI(model, payload);
        }

        if (!result.ok) {
            return { ok: false, error: result.error };
        }

        const outputData = result.value;
        return {
            ok: true,
            value: {
                output: `Specialized AI Result:\n${typeof outputData === 'string' ? outputData : JSON.stringify(outputData, null, 2)}`,
                data: outputData as Record<string, unknown>
            }
        };
    }

    private findMediaFiles(type: 'IMAGE' | 'VIDEO'): MediaFile[] {
        const extensions = type === 'IMAGE' ? ['.jpg', '.jpeg', '.png', '.webp'] : ['.mp4', '.mov', '.avi'];
        const results: MediaFile[] = [];

        try {
            const dir = process.cwd();
            // Optimization: Filter at the readdir level if possible or just use a more efficient loop
            const filenames = readdirSync(dir);

            for (const name of filenames) {
                const lowerName = name.toLowerCase();
                if (extensions.some(ext => lowerName.endsWith(ext))) {
                    const fileAbsPath = join(dir, name);
                    try {
                        const buffer = readFileSync(fileAbsPath);
                        const ext = name.split('.').pop() || '';
                        results.push({
                            mimeType: type === 'IMAGE' ? `image/${ext}` : `video/${ext}`,
                            base64: buffer.toString('base64')
                        });
                        if (results.length >= 3) break;
                    } catch (err) {
                        logger.debug({ path: fileAbsPath, err }, 'Failed to read media file');
                    }
                }
            }
        } catch (e) {
            logger.debug('Error scanning workspace for media files');
        }

        return results;
    }

    private identifyCapability(prompt: string): string | null {
        const p = prompt.toLowerCase();

        // 1. Semantic Intent Mapping (Professional Selection Logic)
        for (const category of Object.values(IntentMap)) {
            for (const pathway of category) {
                if (pathway.keywords.some(k => p.includes(k))) {
                    logger.info({ pathway: pathway.id, reasoning: pathway.reasoning }, 'Semantic Intent Match found');
                    return pathway.targetCapabilityId;
                }
            }
        }

        // 2. Direct ID/Name Matching (Fallback)
        for (const cap of Object.values(CapabilityRegistry)) {
            if (p.includes(cap.id.replace(/_/g, ' ')) || p.includes(cap.name.toLowerCase())) return cap.id;
        }
        return null;
    }
}

