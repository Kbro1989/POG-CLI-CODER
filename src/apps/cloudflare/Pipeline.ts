
import { CloudflareServices } from '../../services/CloudflareServices.js';
import { Result } from '../../core/models.js';

/**
 * CloudflarePipeline - Encapsulates multi-stage creative workflows.
 */
export class CloudflarePipeline {
    constructor(private readonly services: CloudflareServices) { }

    /**
     * Execute a creative pipeline: Interpret -> Generate -> Persist
     */
    async execute(task: string, type: 'image_gen' | 'code_forge' | 'assets_bake' = 'image_gen'): Promise<Result<Record<string, unknown>>> {
        // Phase 1: Interpretation
        const interpretation = await this.interpretTask(task, type);
        if (!interpretation.ok) {
            const error = (interpretation as { ok: false; error: Error }).error;
            return { ok: false, error };
        }
        const prompt = interpretation.value;

        // Phase 2: Generation
        let generation: Result<Uint8Array>;
        if (type === 'image_gen') {
            generation = await this.generateImage(prompt);
        } else {
            return { ok: false, error: new Error(`Pipeline type '${type}' not yet implemented`) };
        }

        if (!generation.ok) {
            const error = (generation as { ok: false; error: Error }).error;
            return { ok: false, error };
        }

        // Phase 3: Persistence
        const assetName = `pipeline_${Date.now()}.png`;
        const persistence = await this.services.putObject(
            'workspace-bucketsespreview',
            assetName,
            Buffer.from(generation.value),
            'image/png'
        );

        if (!persistence.ok) {
            return {
                ok: true,
                value: {
                    status: 'Partial Success',
                    asset: Buffer.from(generation.value).toString('base64'),
                    error: 'Storage failure'
                }
            };
        }

        return {
            ok: true,
            value: {
                status: 'Success',
                assetName,
                bucket: 'workspace-bucketsespreview',
                previewUrl: `https://pub-r2.cloudflare.com/${assetName}`
            }
        };
    }

    private async interpretTask(task: string, type: string): Promise<Result<string>> {
        const systemPrompt = `You are the Cloudflare Pipeline Interpreter. 
Task: "${task}"
Type: "${type}"
Decompose this into a specific image prompt. 
Output ONLY the final prompt for the image generator.`;

        const result = await this.services.runAi('@cf/meta/llama-3.1-8b-instruct-fp8', {
            messages: [
                { role: 'system', content: 'You are a precise prompt engineer.' },
                { role: 'user', content: systemPrompt }
            ]
        });

        if (!result.ok) return result;

        // Robust result extraction
        const data = result.value as Record<string, any>;
        const responseText = (data && typeof data === 'object' && 'response' in data) ? (data['response'] as string) : String(data);

        return { ok: true, value: responseText.trim() };
    }

    private async generateImage(prompt: string): Promise<Result<Uint8Array>> {
        const result = await this.services.runAi<Buffer>('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
            prompt,
            width: 1024,
            height: 1024
        });

        if (!result.ok) return result;
        return { ok: true, value: new Uint8Array(result.value) };
    }
}
