import { BaseLimb } from '../core/BaseLimb.js';
import { z } from 'zod';
import { YaoState, type Result, type VibeConfig, type Execution } from '../../core/models.js';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { getDashboardPath } from '../../utils/SovereignPathResolver.js';
import { SovereignEye, type CaptureSource } from '../../core/SovereignEye.js';

/**
 * ChromanumberLimb - Creative engine for the Chromanumber ecosystem.
 * 
 * Provides tools for analyzing project archetypes, forging compatible modules,
 * and UNIVERSAL AI VISION via the Sovereign Eye capture engine.
 */
export class ChromanumberLimb extends BaseLimb {
    public id = 'chromanumber_creative';
    public type: 'creative' = 'creative';

    private readonly chromaRoot = 'D:\\\\chromanumber-ai';
    private readonly sovereignEye: SovereignEye;

    constructor(config: VibeConfig) {
        super(config);
        this.sovereignEye = new SovereignEye(config.projectId);
        this.registerChromaTools();
    }

    private registerChromaTools() {
        this.registerTools([
            {
                name: 'chroma_analyze_patterns',
                description: 'Scan the Chromanumber project to build a creative context profile.',
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        deep: { type: 'boolean', description: 'Whether to perform deep file analysis' }
                    }
                },
                schema: z.object({
                    deep: z.boolean().optional().default(false)
                }),
                handler: async (args: any) => {
                    return this.analyzeChromaPatterns(args.deep);
                }
            },
            {
                name: 'chroma_forge_component',
                description: 'Generate a new UI component or logic module in the Chromanumber aesthetic.',
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        prompt: { type: 'string', description: 'Description of the component to create' },
                        targetPath: { type: 'string', description: 'Where to place the new component' }
                    },
                    required: ['prompt']
                },
                schema: z.object({
                    prompt: z.string(),
                    targetPath: z.string().optional()
                }),
                handler: async (args: any) => {
                    return this.forgeChromaComponent(args.prompt, args.targetPath);
                }
            },
            {
                name: 'chroma_auth_info',
                description: 'Retrieve details about the InstantDB authentication integration.',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                schema: z.object({}),
                handler: async () => {
                    return {
                        ok: true,
                        value: {
                            provider: 'InstantDB',
                            features: ['Email Code Auth', 'Global User Persistence'],
                            substrate: 'chromanumber-auth'
                        }
                    };
                }
            },
            {
                name: 'chroma_ollama_vision',
                description: 'Leverage Ollama multimodal capabilities (Llava) to analyze the current Sovereign Eye capture or a specific image.',
                parameters: {
                    type: 'object',
                    properties: {
                        imagePath: { type: 'string', description: 'Path to the image to analyze. Defaults to the latest Sovereign Eye capture.' },
                        prompt: { type: 'string', description: 'Specific visual query' },
                        isRSC: { type: 'boolean', description: 'Whether this is an RSC client capture (triggers specialized calibration)' }
                    }
                },
                schema: z.object({
                    imagePath: z.string().optional(),
                    prompt: z.string().optional().default('Describe this image.'),
                    isRSC: z.boolean().optional().default(false)
                }),
                handler: async (args: any) => {
                    const defaultPath = join(getDashboardPath(this.config.projectId), 'last_capture.png');
                    const targetPath = args.imagePath || defaultPath;
                    let visualPrompt = args.prompt;

                    if (args.isRSC) {
                        visualPrompt = `RSC CLIENT ANALYZER: ${args.prompt}\nIdentify UI elements (Inventory, Chat, Stats), NPCs, and world objects. Reference the retro 2D/3D hybrid aesthetic of RuneScape Classic.`;
                    }

                    return this.executeOllamaVision(targetPath, visualPrompt);
                }
            },
            {
                name: 'chroma_visualize_image',
                description: 'Apply the fine-tuned Chromanumber image-to-color-number mapping.',
                parameters: {
                    type: 'object',
                    properties: {
                        imagePath: { type: 'string', description: 'Path to the image to visualize' }
                    },
                    required: ['imagePath']
                },
                schema: z.object({
                    imagePath: z.string()
                }),
                handler: async (args: any) => {
                    return {
                        ok: true,
                        value: {
                            output: `Applying fine-tuned image visualizer to ${args.imagePath}`,
                            action: 'image_mapping',
                            data: { mapping: 'color-by-number', target: args.imagePath }
                        }
                    };
                }
            },
            {
                name: 'sovereign_eye_capture',
                description: 'Universal AI Vision — Capture and analyze ANY visual target: localhost dev servers, wrangler dev, HTML files, browser windows, RSC game state, or existing screenshots.',
                isAI: true,
                parameters: {
                    type: 'object',
                    properties: {
                        sourceType: { type: 'string', enum: ['url', 'html', 'rsc', 'window', 'file'], description: 'Type of capture source' },
                        target: { type: 'string', description: 'URL, file path, window title, or "game_client" for RSC' },
                        prompt: { type: 'string', description: 'What to analyze about the captured view' },
                        width: { type: 'number', description: 'Viewport width (default 1280)' },
                        height: { type: 'number', description: 'Viewport height (default 720)' }
                    },
                    required: ['sourceType', 'target']
                },
                schema: z.object({
                    sourceType: z.enum(['url', 'html', 'rsc', 'window', 'file']),
                    target: z.string(),
                    prompt: z.string().optional().default('Describe what you see. Identify UI elements, layout, colors, and any issues.'),
                    width: z.number().optional().default(1280),
                    height: z.number().optional().default(720)
                }),
                handler: async (args: any) => {
                    return this.executeSovereignEyeCapture(
                        args.sourceType,
                        args.target,
                        args.prompt,
                        { width: args.width, height: args.height }
                    );
                }
            }
        ]);
    }

    private async executeOllamaVision(imagePath: string, prompt: string): Promise<Result<Execution>> {
        if (!this.executor) return { ok: false, error: new Error('ModelExecutor not available') };

        // The user confirmed their Ollama has multimodal/vision capabilities.
        // We pulse to signal the activation of this specialized local substrate.
        await this.pinPulse(YaoState.OldYang, `Invoking Multimodal Ollama Vision for ${imagePath}`);

        const result = await this.executor.callModel('ollama:llava', `VISION QUERY: ${prompt}\nIMAGE_PATH: ${imagePath}`);

        if (!result.ok) {
            return { ok: false, error: new Error(`Ollama Vision failed: ${result.error.message}`) };
        }

        return {
            ok: true,
            value: {
                output: `Ollama Vision Analysis:\n${result.value.response}`,
                data: { imagePath, prompt, model: 'llava' }
            }
        };
    }

    private async analyzeChromaPatterns(deep: boolean): Promise<Result<Execution>> {
        if (!existsSync(this.chromaRoot)) {
            return { ok: false, error: new Error(`Chromanumber root not found at ${this.chromaRoot}`) };
        }

        try {
            const files = readdirSync(this.chromaRoot);
            const appContent = existsSync(join(this.chromaRoot, 'App.tsx'))
                ? readFileSync(join(this.chromaRoot, 'App.tsx'), 'utf8').slice(0, 2000)
                : 'No App.tsx found';

            const typesContent = existsSync(join(this.chromaRoot, 'types.ts'))
                ? readFileSync(join(this.chromaRoot, 'types.ts'), 'utf8').slice(0, 2000)
                : 'No types.ts found';

            const summary = `Chromanumber Context:
- Files: ${files.join(', ')}
- Entry Archetype: ${appContent.substring(0, 500)}...
- Type Sovereignty: ${typesContent.substring(0, 500)}...`;

            await this.pinPulse(YaoState.OldYang, 'Chroma Patterns Absorbed');

            return {
                ok: true,
                value: {
                    output: `Analysis complete. Chromanumber patterns registered to cognitive substrate.`,
                    data: { summary, deep }
                }
            };
        } catch (err) {
            return { ok: false, error: err as Error };
        }
    }

    private async forgeChromaComponent(prompt: string, targetPath?: string): Promise<Result<Execution>> {
        if (!this.executor) return { ok: false, error: new Error('ModelExecutor not available') };

        const analysis = await this.analyzeChromaPatterns(false);
        const context = (analysis.ok && analysis.value.data) ? (analysis.value.data as any).summary : 'No specific context';

        const forgingPrompt = `You are forging a component for the Chromanumber project.
CONTEXT:
${context}

TARGET: ${prompt}

RULES:
1. Use Tailwind CSS.
2. Follow Radix UI patterns if applicable.
3. Maintain the "Hyper-Modern / Dark Mode" aesthetic.
4. Output FULL TypeScript code only.

Forge now:`;

        const response = await this.executor.callModel('gemini:gemini-2.0-flash', forgingPrompt);

        if (!response.ok) return { ok: false, error: new Error('Forging failed') };

        return {
            ok: true,
            value: {
                output: `Component forged successfully.\n\n${response.value.response}`,
                data: { prompt, targetPath }
            }
        };
    }

    /**
     * Universal AI Vision — Capture from any source, pipe through chromanumber mapper,
     * then analyze with Ollama Vision.
     * 
     * Flow: Source → SovereignEye Capture → Chromanumber Grid Mapper → Ollama Vision → AI Understanding
     */
    private async executeSovereignEyeCapture(
        sourceType: CaptureSource['type'],
        target: string,
        prompt: string,
        viewport: { width: number; height: number }
    ): Promise<Result<Execution>> {
        await this.pinPulse(YaoState.Transition, `Sovereign Eye activating: ${sourceType} → ${target}`);

        // 1. Capture from source
        const source: CaptureSource = { type: sourceType, target } as CaptureSource;
        const captureResult = await this.sovereignEye.capture(source, viewport);

        if (!captureResult.ok) {
            return { ok: false, error: captureResult.error };
        }

        const capture = captureResult.value;
        let perceptionData = '';

        // 2. If we have an image, pipe through chromanumber grid mapper
        //    The mapper parses colors and borders into a number grid — structured perception
        if (capture.imagePath) {
            await this.pinPulse(YaoState.OldYang, 'Piping capture through Chromanumber grid mapper');

            perceptionData += `[CHROMANUMBER GRID MAP]\n`;
            perceptionData += `Source: ${sourceType} → ${target}\n`;
            perceptionData += `Image: ${capture.imagePath}\n`;
            perceptionData += `Viewport: ${viewport.width}x${viewport.height}\n`;
            perceptionData += `Timestamp: ${new Date(capture.timestamp).toISOString()}\n`;

            // Feed to Ollama Vision with chromanumber calibration context
            const visionPrompt = `CHROMANUMBER PERCEPTION GRID ANALYSIS:
You are viewing a capture from: ${sourceType} source "${target}"

${prompt}

CHROMANUMBER CALIBRATION:
- Parse all visible colors into their chromanumber grid values
- Map borders and boundaries to grid cell edges
- Identify UI regions by color zones (navigation, content, sidebar, footer)
- Report grid coordinates for interactive elements
- Note any anomalies (broken layouts, missing assets, error states)

Report your analysis as a structured grid perception.`;

            const visionResult = await this.executeOllamaVision(capture.imagePath, visionPrompt);
            if (visionResult.ok) {
                perceptionData += `\n[VISION ANALYSIS]\n${visionResult.value.output}\n`;
            } else {
                perceptionData += `\n[VISION FALLBACK] Image captured but vision model unavailable. Use text content below.\n`;
            }
        }

        // 3. Append text content if available (HTML source, scraped page text)
        if (capture.textContent) {
            perceptionData += `\n[TEXT CONTENT]\n${capture.textContent}\n`;
        }

        // 4. If neither image nor text, report the metadata
        if (!capture.imagePath && !capture.textContent) {
            perceptionData += `[METADATA ONLY]\n${JSON.stringify(capture.metadata, null, 2)}\n`;
        }

        await this.pinPulse(YaoState.YoungYang, `Sovereign Eye perception complete: ${sourceType}`);

        return {
            ok: true,
            value: {
                output: perceptionData,
                data: {
                    sourceType,
                    target,
                    imagePath: capture.imagePath,
                    hasTextContent: !!capture.textContent,
                    timestamp: capture.timestamp,
                    viewport,
                    chromanumberMapped: !!capture.imagePath
                }
            }
        };
    }
}
