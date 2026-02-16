import { BaseLimb } from './BaseLimb.js';
import { Result, VibeConfig } from '../../core/models.js';
import { SOVEREIGN_COMPONENTS } from '../webapp/SovereignLibrary.js';

/**
 * CognitionLimb - The Sovereign Inline Intelligence.
 * 
 * Replaces cloud-based "ghost text" with high-fidelity local prediction.
 * Leverages the Sovereign Library as a few-shot context to ensure
 * generated code is always "on brand" and architecturally aligned.
 */
import { ModelExecutor } from '../../core/ModelExecutor.js';

export class CognitionLimb extends BaseLimb {
    id = 'cognition';
    type = 'analytical' as const;

    constructor(config: VibeConfig, executor?: ModelExecutor) {
        super(config, executor);
        this.registerCognitionTools();
    }

    private registerCognitionTools(): void {
        this.registerTools([
            {
                name: 'predict_inline',
                description: 'Generate high-speed inline code completion based on cursor context and Sovereign patterns.',
                parameters: {
                    type: 'object',
                    properties: {
                        fileContent: { type: 'string', description: 'The full content of the file being edited' },
                        cursorOffset: { type: 'number', description: 'The character offset of the cursor' },
                        contextLines: { type: 'number', description: 'Number of lines of context to consider (default: 50)' }
                    },
                    required: ['fileContent', 'cursorOffset']
                },
                handler: async (args) => {
                    return this.handlePredictInline(args);
                }
            }
        ]);
    }

    private async handlePredictInline(args: any): Promise<Result<string>> {
        const { fileContent, cursorOffset, contextLines = 50 } = args;

        if (!this.executor) {
            return { ok: false, error: new Error('CognitionLimb requires an active executor for prediction.') };
        }

        // 1. Slice Context
        const beforeCursor = fileContent.slice(0, cursorOffset);
        const afterCursor = fileContent.slice(cursorOffset);

        // Take last N lines before cursor for urgency
        const linesBefore = beforeCursor.split('\n');
        const contextBefore = linesBefore.slice(-contextLines).join('\n');

        // 2. Identify Sovereign Context
        // Check if we are inside a component that resembles a Sovereign Pattern
        const knownPatterns = Object.keys(SOVEREIGN_COMPONENTS).join(', ');

        // 3. Construct Prompt (Optimized for Speed)
        const prompt = `ROLE: Sovereign Inline Engine (Latency <200ms)
CONTEXT: POG-CODER-VIBE Substrate
AVAILABLE PATTERNS: ${knownPatterns}

TASK: Complete the code at the [CURSOR] position.
RULES:
1. Output ONLY the code completion. No markdown, no conversation.
2. Match the indentation and style of the context exactly.
3. If the user is starting a Sovereign Pattern (e.g., "Hero"), auto-complete with high fidelity from the Library.

CODE BEFORE CURSOR:
${contextBefore}
[CURSOR]
CODE AFTER CURSOR:
${afterCursor.slice(0, 500)} // Lookahead for context

COMPLETION:`;

        // 4. Execute Prediction
        // We use the monitor model (tinyllama or similar fast model) if available, 
        // otherwise default to the configured fast model.
        // For now, we rely on the executor's default routing, but ideally this should be a "flash" route.
        const model = this.config.monitorModel || 'qwen2.5-coder:7b';

        const result = await this.executor.callModel(model, prompt);

        if (!result.ok) {
            const error = (result as { ok: false; error: Error }).error;
            this.logger.warn({ error }, 'Inline prediction failed');
            return { ok: false, error };
        }

        // 5. Sanitize Output
        // Remove any thinking or markdown wrappers if the model hallucinated them
        let code = result.value.response;
        code = code.replace(/```tsx?/g, '').replace(/```/g, '');

        // Remove "COMPLETION:" label if present (sometimes models leak it)
        code = code.replace(/^COMPLETION:\s*/i, '');

        return {
            ok: true,
            value: code
        };
    }
}
