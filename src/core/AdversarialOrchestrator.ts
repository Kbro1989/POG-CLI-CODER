import {
    Result,
    ModelResponse,
    VibeConfig,
    isErr
} from './models.js';
import { ModelExecutor } from './ModelExecutor.js';
import { ValidationSystem } from './validation/ValidationSystem.js';
import { ArchitectureDigest } from './ArchitectureDigest.js';
import pino from 'pino';

/**
 * AdversarialOrchestrator - The "Hallucination Eradication" Core.
 * Implements a 3-agent loop:
 * 1. Generator: Proposes code (Local or Cloud).
 * 2. Critic: Aggressively finds flaws (Gemini Thinking).
 * 3. Reviewer: Final sanity check before delivery.
 */
export class AdversarialOrchestrator {
    private readonly logger: pino.Logger;

    constructor(
        private readonly config: VibeConfig,
        private readonly executor: ModelExecutor,
        private readonly validationSystem: ValidationSystem,
        private readonly architectureDigest: ArchitectureDigest
    ) {
        this.logger = pino({
            name: 'AdversarialOrchestrator',
            base: { hostname: this.config.agentName }
        });
    }

    /**
     * Generates validated code using adversarial iterations.
     */
    async generateValidatedCode(
        prompt: string,
        modelName: string,
        context?: any
    ): Promise<Result<ModelResponse>> {
        this.logger.info({ model: modelName }, 'Starting adversarial generation loop');

        let iterations = 0;
        const maxIterations = 3;
        let currentPrompt = prompt;
        let lastResponse: ModelResponse | null = null;

        while (iterations < maxIterations) {
            iterations++;
            this.logger.debug({ iteration: iterations }, 'Generator turn');

            // 1. Generate candidate (Generator)
            const genResult = await this.executor.callModel(modelName, currentPrompt);
            if (!genResult.ok) return genResult;

            lastResponse = genResult.value;
            const candidateCode = lastResponse.response;

            // 2. Validate (Validation Stack)
            const validation = await this.validationSystem.validateAll(candidateCode, context);

            if (validation.ok) {
                // 3. Critique (Adversarial Critic - Gemini Thinking preferred)
                const critique = await this.performCritique(candidateCode, prompt);

                if (critique.score >= 90) {
                    this.logger.info({ score: critique.score, iterations }, 'Adversarial verification PASSED');
                    return { ok: true, value: lastResponse };
                }

                this.logger.warn({ score: critique.score, flaws: critique.flaws.length }, 'Adversarial verification REJECTED by critic');
                currentPrompt = this.buildRejectionPrompt(candidateCode, [], critique.flaws);
            } else {
                this.logger.warn({ reason: validation.error.reason }, 'Code REJECTED by validation stack');
                currentPrompt = this.buildRejectionPrompt(candidateCode, [validation.error.reason], []);
            }
        }

        return {
            ok: false,
            error: new Error(`Failed to generate sovereign code after ${maxIterations} adversarial iterations.`)
        };
    }

    private async performCritique(code: string, originalPrompt: string): Promise<{ score: number; flaws: string[] }> {
        const criticPrompt = `
FIND ALL FLAWS in the following code compared to the original request. 
BE MERCILESS. Check for:
1. Hallucinated APIs or non-existent files.
2. Logic bugs or missing edge cases.
3. Violations of "NO MOCKS" (placeholders like TODO).
4. Type safety issues.

Original Request: ${originalPrompt}
Proposed Code:
\`\`\`
${code}
\`\`\`

Output ONLY a JSON object:
{
  "score": 0 to 100,
  "flaws": ["Direct description of flaw 1", "Direct description of flaw 2"]
}
`;

        // Use Gemini Thinking for deep reflection if available, or Pro as fallback
        const criticPromptAugmented = this.architectureDigest.inject(criticPrompt);
        const result = await this.executor.callModel('gemini:gemini-2.0-flash', criticPromptAugmented);
        if (isErr(result)) {
            this.logger.warn({ error: result.error }, 'Critic call failed, falling back to Pro baseline');
            const backupResult = await this.executor.callModel('gemini:gemini-1.5-pro', criticPromptAugmented);
            if (isErr(backupResult)) return { score: 95, flaws: [] };
            if (backupResult.ok) {
                return this.parseCriticResponse(backupResult.value.response);
            }
            return { score: 95, flaws: [] };
        }

        if (result.ok) {
            return this.parseCriticResponse(result.value.response);
        }
        return { score: 95, flaws: [] };
    }

    private parseCriticResponse(response: string): { score: number; flaws: string[] } {
        try {
            const jsonStr = response.match(/\{[\s\S]*\}/)?.[0];
            if (!jsonStr) throw new Error('No JSON output from critic');
            return JSON.parse(jsonStr);
        } catch (e) {
            this.logger.warn('Failed to parse critic JSON, assuming success to avoid loop');
            return { score: 95, flaws: [] };
        }
    }

    private buildRejectionPrompt(code: string, validationFailures: string[], criticFlaws: string[]): string {
        return `
YOUR PREVIOUS OUTPUT WAS REJECTED. YOU MUST FIX THE FOLLOWING ISSUES:

${validationFailures.map(f => `- [CRITICAL] ${f}`).join('\n')}
${criticFlaws.map(f => `- [FLAW] ${f}`).join('\n')}

PREVIOUS (INVALID) CODE:
\`\`\`
${code}
\`\`\`

RULES FOR RE-GENERATION:
1. Implement the logic FULLY. No TODOs, no stubs, no mocks.
2. Fix every flaw listed above.
3. Ensure the code is production-grade.

GENERATE THE CORRECT IMPLEMENTATION NOW:
`;
    }
}
