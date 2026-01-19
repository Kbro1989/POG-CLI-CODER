import { NeuralLimb, Intent, Execution } from '../../limbs/core/NeuralLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { AIDispatcher } from './Dispatcher.js';
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

export class AILimb implements NeuralLimb {
    id = 'ai_limb';
    type = 'analytical' as const;
    capabilities = Object.keys(CapabilityRegistry);

    private catalog = {
        models: CapabilityRegistry,
        tasks: CatalogMetadata.tasks,
        providers: CatalogMetadata.providers
    };

    private dispatcher: AIDispatcher;

    constructor(config: VibeConfig) {
        this.dispatcher = new AIDispatcher(config);
        logger.debug('AILimb initialized with baked-in capabilities');
    }

    async canHandle(intent: Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();

        // Support for Meta-queries
        const metaKeywords = ['how many', 'list all', 'what is new', 'what\'s new', 'capabilities', 'supported providers', 'supported tasks'];
        if (metaKeywords.some(k => p.includes(k))) return true;

        // Check if any registry ID or description keywords are in the prompt
        return Object.values(CapabilityRegistry).some(cap => {
            const idMatch = p.includes(cap.id.replace(/_/g, ' '));
            const nameMatch = p.includes(cap.name.toLowerCase());
            return idMatch || nameMatch;
        });
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
            const results: any[] = [];
            let cumulativeOutput = '';

            for (const step of steps) {
                const stepIntent: Intent = { ...intent, prompt: step.trim() };
                const stepResult = await this.executeSingleIntent(stepIntent);
                if (!stepResult.ok) return stepResult;
                results.push(stepResult.value.data);
                cumulativeOutput += `\n--- Step: ${step.trim()} ---\n${stepResult.value.output}\n`;
            }

            return {
                ok: true,
                value: {
                    output: `Multi-Path Execution Completed:${cumulativeOutput}`,
                    data: { chainResults: results }
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

        let payload: any = prompt;

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

        const response = await this.dispatcher.dispatch({
            capabilityId,
            payload
        });

        if (!response.success) {
            return { ok: false, error: new Error(response.error) };
        }

        return {
            ok: true,
            value: {
                output: `Specialized AI Result (${response.serviceUsed}):\n${JSON.stringify(response.result, null, 2)}`,
                data: response.result
            }
        };
    }

    private findMediaFiles(type: 'IMAGE' | 'VIDEO'): Array<{ mimeType: string; base64: string }> {
        const extensions = type === 'IMAGE' ? ['.jpg', '.jpeg', '.png', '.webp'] : ['.mp4', '.mov', '.avi'];
        const results: Array<{ mimeType: string; base64: string }> = [];

        try {
            const dir = process.cwd();
            const filenames = readdirSync(dir);

            for (const name of filenames) {
                if (extensions.some(ext => name.toLowerCase().endsWith(ext))) {
                    const fileAbsPath = join(dir, name);
                    try {
                        const buffer = readFileSync(fileAbsPath);
                        results.push({
                            mimeType: type === 'IMAGE' ? `image/${name.split('.').pop()}` : `video/${name.split('.').pop()}`,
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
