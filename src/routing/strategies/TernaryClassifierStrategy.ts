/**
 * @license
 * POG-CODER-VIBE
 * Ternary Classification Strategy (PLACEHOLDER FOR FUTURE IMPLEMENTATION)
 * Will use lightweight LLM for Local/Edge/Cloud routing classification
 */

import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import type { Logger } from 'pino';
import pino from 'pino';

/**
 * A routing strategy that uses heuristics to classify requests into ternary tiers.
 * Currently uses simple prompt analysis - can be upgraded to LLM-based classification later.
 * Returns null if classification is uncertain (lets other strategies handle).
 */
export class TernaryClassifierStrategy implements RoutingStrategy {
    readonly name = 'ternary-classifier';
    private logger: Logger;

    constructor() {
        this.logger = pino({ name: 'TernaryClassifierStrategy' });
    }

    async route(context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();

        try {
            // Heuristic classification based on prompt analysis
            const classification = this.classifyPrompt(context.prompt);

            const latencyMs = Math.round(performance.now() - startTime);

            this.logger.info(
                {
                    tier: classification.tier,
                    confidence: classification.confidence,
                    latencyMs,
                },
                'Request classified'
            );

            return {
                model: classification.tier,
                metadata: {
                    source: 'ternary-classifier',
                    latencyMs,
                    reasoning: classification.reasoning,
                },
            };
        } catch (error) {
            this.logger.warn({ error }, 'Classification failed');
            return null; // Let next strategy handle
        }
    }

    private classifyPrompt(prompt: string): {
        tier: string;
        reasoning: string;
        confidence: number;
    } {
        const lowerPrompt = prompt.toLowerCase();

        // Complex indicators (Cloud)
        const complexIndicators = [
            'design',
            'architecture',
            'refactor',
            'optimize',
            'debug',
            'analyze',
            'explain how',
            'explain why',
            'best practice',
        ];

        // Medium indicators (Edge)
        const mediumIndicators = [
            'modify',
            'update',
            'change',
            'add',
            'implement',
            'create',
            'write',
        ];

        // Simple indicators (Local)
        const simpleIndicators = ['list', 'show', 'read', 'view', 'get', 'find'];

        // Check for complex patterns first
        const hasComplexity = complexIndicators.some((ind) =>
            lowerPrompt.includes(ind)
        );
        if (hasComplexity) {
            return {
                tier: 'cloud',
                reasoning:
                    'Detected strategic/complex keywords suggesting cloud-tier reasoning',
                confidence: 0.8,
            };
        }

        // Check for medium complexity
        const hasMediumComplexity = mediumIndicators.some((ind) =>
            lowerPrompt.includes(ind)
        );
        if (hasMediumComplexity) {
            return {
                tier: 'edge',
                reasoning:
                    'Detected modification keywords suggesting edge-tier hybrid approach',
                confidence: 0.7,
            };
        }

        // Check for simple operations
        const isSimple = simpleIndicators.some((ind) => lowerPrompt.includes(ind));
        if (isSimple) {
            return {
                tier: 'local',
                reasoning:
                    'Detected simple read-only operation suitable for local execution',
                confidence: 0.85,
            };
        }

        // Default to local for unknown patterns (safest choice)
        return {
            tier: 'local',
            reasoning:
                'No strong classification indicators - defaulting to local for safety',
            confidence: 0.5,
        };
    }
}
