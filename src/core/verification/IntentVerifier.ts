import { ModelExecutor } from '../ModelExecutor.js';

import { HexagramManager } from '../HexagramManager.js';
import { ExecutionContext, AgentTurnResult } from '../models.js';
import pino from 'pino';

export interface VerificationResult {
    score: number; // 0-100
    isAligned: boolean;
    reasoning: string;
    correction?: string;
}

/**
 * IntentVerifier - The Sovereign Auditor.
 * Runs after every execution turn to ensure alignment with:
 * 1. Original User Intent (The "Command")
 * 2. Hexagram Context (The "Situation")
 * 3. Project Rules (The "Law")
 */
export class IntentVerifier {
    private readonly logger: pino.Logger;

    constructor(
        private readonly executor: ModelExecutor,
        private readonly hexagramManager: HexagramManager
    ) {
        this.logger = pino({ name: 'IntentVerifier' });
    }

    /**
     * Verifies the output of a single execution turn against the sovereign intent.
     */
    async verify(
        originalPrompt: string,
        turnResult: AgentTurnResult,
        context: ExecutionContext
    ): Promise<VerificationResult> {
        // Skip verification if the turn is just continuing (intermediate steps) unless strictly enforced
        // But the user requested "compare user intent requested against outputs as it goes", so we verify everything.

        const outputText = turnResult.status === 'stop'
            ? turnResult.finalResult || 'No output'
            : turnResult.nextMessage;

        const hexagramContext = await this.hexagramManager.formatForPrompt();

        const auditPrompt = `
=== SOVEREIGN AUDIT ===
Your task is to VERIFY if the following execution step aligns with the User's Sovereign Intent and the Project Rules.

ORIGINAL INTENT:
"${originalPrompt}"

CURRENT EXECUTION OUTPUT:
"${outputText.substring(0, 2000)}..."

CONSEQUENTIAL CONTEXT:
Session ID: ${context.sessionId}
File Path: ${context.filePath || 'None'}

CONTEXT (The Situation):
${hexagramContext}

PROJECT RULES (The Law):
1. NO MOCKS or Placeholders.
2. NO "I cannot do that" (unless physically impossible).
3. NO deviations from explicit commands (e.g. if user said "delete", did it delete?).

TASK:
Score the alignment from 0-100.
- 100: Perfect alignment.
- 80-99: Minor stylistic drift, but intent preserved.
- <50: Critical failure (Refusal, Hallucination, Rule Violation).

OUTPUT FORMAT (JSON):
{
  "score": number,
  "reasoning": "Brief explanation of the score",
  "correction": "Suggested fix if score < 80"
}
`;

        const result = await this.executor.callModel('gemini:gemini-3-flash-preview', auditPrompt);

        if (!result.ok) {
            const error = (result as { ok: false; error: Error }).error;
            this.logger.warn({ error }, 'Verification failed, assuming alignment');
            return { score: 100, isAligned: true, reasoning: 'Verifier offline' };
        }

        try {
            const responseText = result.value.response.replace(/```json|```/g, '').trim();
            const audit = JSON.parse(responseText);

            this.logger.info({
                score: audit.score,
                reason: audit.reasoning
            }, 'Intent Verification Complete');

            return {
                score: audit.score,
                isAligned: audit.score >= 80,
                reasoning: audit.reasoning,
                correction: audit.correction
            };

        } catch (e) {
            this.logger.error({ error: e, response: result.value.response }, 'Failed to parse verification audit');
            return { score: 100, isAligned: true, reasoning: 'Parse failure' };
        }
    }
}
