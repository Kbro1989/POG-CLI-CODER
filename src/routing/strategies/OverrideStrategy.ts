import type { RoutingContext, RoutingDecision, RoutingStrategy } from '../types.js';
import { IntentMap } from '../../api/ai/IntentMap.js';

/**
 * A strategy that identifies specific intents (DevOps, Security, Health)
 * and overrides the standard routing with high-certainty specific models.
 */
export class OverrideStrategy implements RoutingStrategy {
    readonly name = 'override';

    async route(context: RoutingContext): Promise<RoutingDecision | null> {
        const startTime = performance.now();
        const prompt = context.prompt.toLowerCase();
        const { weightedTasks, metadata } = context;
        const availableModels = context.availableModels || [];

        // 0. GHOST FAILOVER (Highest Priority)
        // If the Ghost has taken control (HealthStatus.Ready / +1), all intents are diverted
        // to the deterministic terminator to bypass cloud heuristics entirely.
        if (metadata?.['ghostEngagementLevel'] === 1) {
            return {
                model: 'ghost-terminator',
                metadata: {
                    source: 'ghost-override',
                    latencyMs: Math.round(performance.now() - startTime),
                    reasoning: 'GHOST_CONTROL_ACTIVE: Deterministic failover engaged. Bypassing cloud heuristics.',
                },
            };
        }

        // 0.1 ESOTERIC ESCALATION (Reasoning Forge)
        // If we are "stuck" (turn > 2) or explicit esoteric intent is detected, escalate to Kimi.
        const isStuck = metadata?.['isStuck'] === true;
        const esotericWeight = weightedTasks?.['esoteric'] || 0;

        if (isStuck || esotericWeight > 0.8 || prompt.includes('kimi') || prompt.includes('esoteric')) {
            // Only escalate if Ghost is NOT in control
            const reasoning = isStuck
                ? 'SYSTEM_STUCK: Cloud loops repeating without progress. Escalating to Kimi Reasoning Forge.'
                : 'ESOTERIC_INTENT: High-complexity mental model detected. Routing to Kimi.';

            return {
                model: 'gold_huggingface_kimi',
                metadata: {
                    source: 'esoteric-escalation',
                    latencyMs: Math.round(performance.now() - startTime),
                    reasoning: reasoning
                }
            };
        }

        // 0. Respect Sovereign User Preference (Explicit Model Request)
        // If the user explicitly names a model, we yield to the Analytical/Selection strategies
        // to avoid overriding their specific command with a general intent override.
        const explicitRequest = availableModels.find(m => prompt.includes(m.name.toLowerCase()));
        if (explicitRequest) {
            return null;
        }

        // 1. Layer 2: Elite Intent Pathing (Short-Circuit)
        for (const category of Object.values(IntentMap)) {
            for (const path of category) {
                if (path.keywords.some(kw => prompt.includes(kw.toLowerCase()))) {
                    const targetModel = path.targetCapabilityId;
                    if (availableModels.some(m => m.name === targetModel && m.health?.isAvailable)) {
                        return {
                            model: targetModel,
                            metadata: {
                                source: 'override-elite',
                                latencyMs: Math.round(performance.now() - startTime),
                                reasoning: `Elite Path Match: ${path.description}. ${path.reasoning}`,
                            },
                        };
                    }
                }
            }
        }

        // 2. Health & Status Override (Local/Edge)
        if (prompt.length < 50 && /\b(health|status|audit|check|verify|ping)\b/.test(prompt)) {
            return {
                model: 'gemini-2.0-flash', // Flash is the standard for rapid health
                metadata: {
                    source: 'override',
                    latencyMs: Math.round(performance.now() - startTime),
                    reasoning: 'Intention: Rapid health/status check - Routing to high-availability edge',
                },
            };
        }

        // 3. DevOps & High-Stakes Override (Cloud)
        const isDevOps = /\b(wrangler|gcloud|deploy|production|critical|security|auth|secrets|env|ci|cd)\b/.test(prompt);
        if (isDevOps || (weightedTasks?.['api-orchestration'] || 0) > 0.8) {
            return {
                model: 'gemini-3-pro-preview', // Pro for high-stakes
                metadata: {
                    source: 'override',
                    latencyMs: Math.round(performance.now() - startTime),
                    reasoning: 'Intention: DevOps/Security/Orchestration - Routing to cloud-tier reasoning',
                },
            };
        }

        // 4. Architecture & Structural Override (Cloud Thinking)
        if ((weightedTasks?.['architecture'] || 0) > 0.8) {
            return {
                model: 'gemini-3-pro-preview', // Ideally gemini-thinking-experimental if available
                metadata: {
                    source: 'override',
                    latencyMs: Math.round(performance.now() - startTime),
                    reasoning: 'Intention: Deep Architecture - Routing to cloud-tier thinking powerhouse',
                },
            };
        }

        return null;
    }
}
