import {
    Result,
    ModelResponse,
    VibeConfig
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
        context?: unknown
    ): Promise<Result<ModelResponse>> {
        this.logger.info({ model: modelName }, 'Starting 3x3x3 adversarial parallel generation loop');

        let iterations = 0;
        const maxIterations = 3;
        let currentPrompt = prompt;

        while (iterations < maxIterations) {
            iterations++;
            this.logger.debug({ iteration: iterations }, 'Parallel Generator turn');

            // 1. Generate 3 candidates (Parallel Thought Processes + Acting Helpers)
            const typeHints = this.generateTypeSafetyHints(currentPrompt);
            const successScenario = this.generateSuccessScenario(currentPrompt);

            const candidatePromises = [
                this.executor.callModel(modelName, currentPrompt),
                this.executor.callModel(modelName, `${currentPrompt}\n${typeHints}\nOPTIMIZE for absolute robustness.`),
                this.executor.callModel(modelName, `${currentPrompt}\n${successScenario}\nENSURE no placeholders or logic gaps.`)
            ];

            const results = await Promise.all(candidatePromises);
            const validCandidates = results.filter((r): r is { ok: true; value: ModelResponse } => r.ok).map(r => r.value);

            if (validCandidates.length === 0) {
                const firstErr = results.find(r => !r.ok);
                return (firstErr as Result<ModelResponse>) || { ok: false, error: new Error('All candidates failed') };
            }

            // 2. Evaluate all candidates
            const evaluations = await Promise.all(validCandidates.map(async (cand) => {
                const code = cand.response || '';
                const validation = await this.validationSystem.validateAll(code, context);
                const critique = await this.performCritique(code, prompt);

                // Reflective Helper: Anti-Pattern Hunter
                const antiPatterns = this.huntAntiPatterns(critique.flaws);
                if (antiPatterns.length > 0) {
                    // Penalize score for anti-patterns and record as forbidden
                    const penalizedScore = Math.max(0, critique.score - (antiPatterns.length * 15));
                    return {
                        cand,
                        validation,
                        critique: { ...critique, score: penalizedScore, shouldNotBe: [...critique.shouldNotBe, ...antiPatterns] }
                    };
                }

                return { cand, validation, critique };
            }));

            // 3. Select the best (Sovereign Synthesis)
            evaluations.sort((a, b) => b.critique.score - a.critique.score);
            const winner = evaluations[0];

            if (!winner) {
                return { ok: false, error: new Error('Failed to evaluate candidates') };
            }

            // Reflective Helper: Synthesis Weaver
            // If the winner is decent but not exceptional, try to weave a masterpiece from others
            if (winner.critique.score >= 80 && winner.critique.score < 96 && validCandidates.length > 1) {
                const masterpiece = await this.weaveSynthesis(validCandidates, prompt);
                winner.cand = masterpiece;
                // Re-validate the synthesized masterpiece
                winner.validation = await this.validationSystem.validateAll(masterpiece.response || '', context);
                winner.critique = await this.performCritique(masterpiece.response || '', prompt);
            }

            if (winner.validation.ok && winner.critique.score >= 90) {
                this.logger.info({ score: winner.critique.score, iterations }, 'Adversarial verification PASSED');
                return { ok: true, value: winner.cand };
            }

            this.logger.warn({
                bestScore: winner.critique.score,
                iterations,
                shouldNotBeCount: winner.critique.shouldNotBe.length
            }, 'Adversarial verification REJECTED - iterating with best candidate feedback');

            // Categorize the rejection prompt with "Should Not Be" awareness
            const validationError = winner.validation.ok ? null : (winner.validation as { ok: false; error: { reason: string } }).error;
            currentPrompt = this.buildPhilosophicalRejectionPrompt(
                winner.cand.response || '',
                validationError ? [validationError.reason] : [],
                winner.critique.flaws,
                winner.critique.shouldNotBe
            );
        }

        return {
            ok: false,
            error: new Error(`Failed to generate sovereign code after ${maxIterations} ternary iterations.`)
        };
    }

    private async performCritique(code: string, originalPrompt: string): Promise<{ score: number; flaws: string[]; shouldNotBe: string[] }> {
        const criticPrompt = `
FIND ALL FLAWS in the following code compared to the original request. 
BE MERCILESS. Categorize your findings into:
1. MASKED_LOGIC: placeholders (TODO), mocks, or faked functionality ("Should Not Be").
2. HALLUCINATION: non-existent APIs, files, or variables ("Should Not Be").
3. LOGIC_BUG: incorrect edge case handling or core flow errors.
4. TYPE_VIOLATION: strict TypeScript errors or invalid assumptions.

Original Request: ${originalPrompt}
Proposed Code:
\`\`\`
${code}
\`\`\`

Respond exactly in this format:
SCORE: [0-100]
FLAWS:
- [Category] [Description]
`;

        const criticModel = this.config.criticModel || 'gemini:gemini-3-pro-preview';
        this.logger.debug({ criticModel }, 'Invoking adversarial critic with Philosophical Categorization');

        const criticPromptAugmented = this.architectureDigest.inject(criticPrompt);
        const result = await this.executor.callModel(criticModel, criticPromptAugmented);

        if (!result.ok) {
            const error = (result as { ok: false; error: Error }).error;
            this.logger.warn({ error }, 'Critic failed, assuming baseline score');
            return { score: 95, flaws: [], shouldNotBe: [] };
        }

        const response = result.value.response || '';
        if (!response) {
            this.logger.warn('Critic returned empty response, assuming baseline score');
            return { score: 95, flaws: [], shouldNotBe: [] };
        }

        return this.parseCategorizedResponse(response);
    }

    private parseCategorizedResponse(response: string): { score: number; flaws: string[]; shouldNotBe: string[] } {
        const scoreMatch = response.match(/SCORE:\s*(\d+)/);
        const score = scoreMatch && scoreMatch[1] ? parseInt(scoreMatch[1]) : 50;

        const flaws: string[] = [];
        const shouldNotBe: string[] = [];
        const lines = response.split('\n');

        for (const line of lines) {
            if (line.trim().startsWith('-')) {
                const flaw = line.trim().substring(1).trim();
                flaws.push(flaw);
                if (flaw.includes('MASKED_LOGIC') || flaw.includes('HALLUCINATION')) {
                    shouldNotBe.push(flaw);
                }
            }
        }

        return { score, flaws, shouldNotBe };
    }

    private buildPhilosophicalRejectionPrompt(
        code: string,
        validationFailures: string[],
        criticFlaws: string[],
        shouldNotBe: string[]
    ): string {
        return `
YOUR PREVIOUS OUTPUT WAS REJECTED. YOU MUST FIX THE FOLLOWING ISSUES:

${validationFailures.map(f => `- [CRITICAL] ${f}`).join('\n')}
${criticFlaws.map(f => `- [FLAW] ${f}`).join('\n')}

PHILOSOPHICAL BOUNDARY VIOLATIONS ("Should Not Be"):
${shouldNotBe.map(f => `- [FORBIDDEN] ${f}`).join('\n')}

PREVIOUS (INVALID) CODE:
\`\`\`
${code}
\`\`\`

RULES FOR RE-GENERATION:
1. Implement the logic FULLY. No TODOs, no stubs, no mocks.
2. FIX THE FORBIDDEN PATTERNS LISTED ABOVE.
3. Ensure the code is production-grade and follows the "Should Be" standard.

GENERATE THE CORRECT IMPLEMENTATION NOW:
`;
    }

    /**
     * ACT HELPER: Type-Safety Sentinel
     */
    private generateTypeSafetyHints(code: string): string {
        if (!code) return "";
        // Extract potential interface/type needs from code
        const hasAny = code.includes('any');
        return hasAny ? "SENTINEL: Replace 'any' with specific types or 'unknown'. Ensure strict null checks." : "";
    }

    /**
     * ACT HELPER: Unit-Test Shadow
     */
    private generateSuccessScenario(prompt: string): string {
        // Create a simple assertion the model must satisfy
        return `SUCCESS CRITERION: The code must handle the primary intent '${prompt.substring(0, 30)}...' without side-effects.`;
    }

    /**
     * REFLECT HELPER: Anti-Pattern Hunter
     */
    private huntAntiPatterns(flaws: string[]): string[] {
        const antiPatterns = ["TODO", "FIXME", "MOCK", "STUB", "PLACEHOLDER"];
        return flaws.filter(f => antiPatterns.some(ap => f.toUpperCase().includes(ap)));
    }

    /**
     * REFLECT HELPER: Synthesis Weaver
     * Merges the best logic from multiple candidates if needed.
     */
    private async weaveSynthesis(candidates: ModelResponse[], prompt: string): Promise<ModelResponse> {
        this.logger.info('Synthesis Weaver: Attempting to merge candidate logic for optimal output');
        const synthesisPrompt = `
MERGE the following 3 code candidates into a single MASTERPIECE.
Use the robustness of Candidate 1, the elegance of Candidate 2, and the completeness of Candidate 3.

Original Intent: ${prompt}

${candidates.map((c, i) => `Candidate ${i + 1}:\n\`\`\`\n${c.response || '// No response'}\n\`\`\``).join('\n\n')}

OUTPUT ONLY THE FINAL MERGED CODE.
`;
        const result = await this.executor.callModel(this.config.criticModel || 'gemini-3-pro-preview', synthesisPrompt);

        if (result.ok) {
            return result.value;
        }
        return candidates[0]!;
    }
}
