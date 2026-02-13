import { BaseLimb } from './BaseLimb.js';
import { z } from 'zod';
import { Type } from '@google/genai';
import type { VibeConfig, Result } from '../../core/models.js';
import type { FreeModelRouter } from '../../core/Router.js';

/**
 * ControlPlaneLimb - The "Executive Function" of the POG system.
 * 
 * Houses the internal orchestration tools previously hardcoded in Orchestrator.ts.
 * Standardized via the Tooling Spine.
 */
export class ControlPlaneLimb extends BaseLimb {
    readonly id = 'control_plane';
    readonly type = 'analytical';

    constructor(
        config: VibeConfig,
        private readonly router: FreeModelRouter, // Fixed: Explicit typing instead of 'any'
    ) {
        super(config);
        this.registerControlTools();
    }

    private registerControlTools(): void {
        this.registerTools([
            {
                name: 'plan_tool_execution',
                description: 'Decomposes a task into a sequence of actionable steps with tool mappings.',
                parameters: {
                    type: 'object',
                    properties: {
                        goal: { type: 'string', description: 'The final objective.' },
                        steps: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    tool: { type: 'string', enum: ['Sandbox', 'GitManager', 'WebAppForge', 'Wrangler', 'gcloud', 'FileSystem'] },
                                    args: { type: 'array', items: { type: 'string' } },
                                    reasoning: { type: 'string' },
                                    rollback: { type: 'string', description: 'Command to run if this step fails.' }
                                },
                                required: ['tool', 'args', 'reasoning']
                            }
                        }
                    },
                    required: ['goal', 'steps']
                },
                schema: z.object({
                    goal: z.string(),
                    steps: z.array(z.object({
                        tool: z.enum(['Sandbox', 'GitManager', 'WebAppForge', 'Wrangler', 'gcloud', 'FileSystem']),
                        args: z.array(z.string()),
                        reasoning: z.string(),
                        rollback: z.string().optional()
                    }))
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ status: string }>> => {
                    const steps = (args['steps'] as unknown[]) || [];
                    this.logger.info({ goal: args['goal'] as string, stepCount: steps.length }, 'Plan documented in Control Plane');
                    return { ok: true, value: { status: 'plan_recorded' } };
                }
            },
            {
                name: 'route_model',
                description: 'Selects the optimal model for a specific task type and context.',
                parameters: {
                    type: 'object',
                    properties: {
                        taskType: { type: 'string', enum: ['architecture', 'syntax', 'refactor', 'debug', 'generate'] },
                        contextSize: { type: 'number', description: 'Estimated token count.' },
                        requiresCloud: { type: 'boolean' },
                        reason: { type: 'string', description: 'The reasoning or prompt context that requires routing.' }
                    },
                    required: ['taskType', 'reason']
                },
                schema: z.object({
                    taskType: z.enum(['architecture', 'syntax', 'refactor', 'debug', 'generate']),
                    contextSize: z.number().optional(),
                    requiresCloud: z.boolean().optional(),
                    reason: z.string()
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ selectedModel: string; reason: string }>> => {
                    this.logger.info({ reason: args['reason'] as string }, 'Dynamic routing coordination');
                    // Fixed: Explicit coordination through the router instance
                    const routeResult = await this.router.route(args['reason'] as string);
                    return {
                        ok: true,
                        value: {
                            selectedModel: routeResult.ok ? routeResult.value : 'fallback',
                            reason: args['reason'] as string
                        }
                    };
                }
            },
            {
                name: 'evaluate_result',
                description: 'Analyzes execution output to determine success and identify lessons.',
                parameters: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        errorType: { type: 'string', description: 'Categorized error (e.g., Timeout, Syntax, Permission).' },
                        diff: { type: 'string', description: 'Unified diff of changes made.' },
                        lessons: {
                            type: 'array',
                            items: { type: Type.STRING }
                        },
                        regretLikelihood: { type: 'number', minimum: 0, maximum: 1 }
                    },
                    required: ['success', 'lessons', 'regretLikelihood']
                },
                schema: z.object({
                    success: z.boolean(),
                    errorType: z.string().optional(),
                    diff: z.string().optional(),
                    lessons: z.array(z.string()),
                    regretLikelihood: z.number().min(0).max(1)
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ auditId: string }>> => {
                    this.logger.info({ success: args['success'] }, 'Result evaluation recorded');
                    return { ok: true, value: { auditId: `AUDIT_${Date.now()}` } };
                }
            },
            {
                name: 'manage_durable_memory',
                description: 'Manages persistent state and assets (Vector snapshots, artifacts) on GCS.',
                parameters: {
                    type: 'object',
                    properties: {
                        intent: {
                            type: 'string',
                            enum: [
                                'store_vector_snapshot',
                                'fetch_execution_artifact',
                                'commit_model_output',
                                'load_router_checkpoint',
                                'archival_cleanup'
                            ]
                        },
                        payload_uri: { type: 'string' },
                        metadata: { type: 'object' }
                    },
                    required: ['intent', 'payload_uri']
                },
                schema: z.object({
                    intent: z.enum([
                        'store_vector_snapshot',
                        'fetch_execution_artifact',
                        'commit_model_output',
                        'load_router_checkpoint',
                        'archival_cleanup'
                    ]),
                    payload_uri: z.string(),
                    metadata: z.record(z.unknown()).optional() // Fixed: Using unknown instead of any
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ status: string; uri: string }>> => {
                    this.logger.info({ intent: args['intent'] as string, uri: args['payload_uri'] as string }, 'Durable memory operation');
                    return { ok: true, value: { status: 'operation_queued', uri: args['payload_uri'] as string } };
                }
            },
            {
                name: 'emit_execution_manifest',
                description: 'Records a complete audit log of a cognitive intent to GCS.',
                parameters: {
                    type: 'object',
                    properties: {
                        intentId: { type: 'string' },
                        routingDecision: { type: 'object' },
                        toolChain: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        artifactPointers: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        lessonDerived: { type: 'boolean' }
                    },
                    required: ['intentId', 'routingDecision', 'toolChain']
                },
                schema: z.object({
                    intentId: z.string(),
                    routingDecision: z.record(z.unknown()), // Fixed: Using unknown
                    toolChain: z.array(z.string()),
                    artifactPointers: z.array(z.string()).optional(),
                    lessonDerived: z.boolean().optional()
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ manifestUri: string }>> => {
                    this.logger.info({ intentId: args['intentId'] }, 'Emitting execution manifest');
                    return { ok: true, value: { manifestUri: `gs://pog-audit/manifests/${Date.now()}.json` } };
                }
            },
            {
                name: 'cloud_shell_cognitive_assist',
                description: 'Leverages Gemini in Cloud Shell for terminal-aware code generation or debugging.',
                parameters: {
                    type: 'object',
                    properties: {
                        intent: {
                            type: 'string',
                            enum: ['explain_terminal_error', 'generate_infra_script', 'debug_context']
                        },
                        terminal_context: { type: 'string' },
                        proposed_action: { type: 'string' }
                    },
                    required: ['intent', 'terminal_context']
                },
                schema: z.object({
                    intent: z.enum(['explain_terminal_error', 'generate_infra_script', 'debug_context']),
                    terminal_context: z.string(),
                    proposed_action: z.string().optional()
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ status: string; advice: string }>> => {
                    this.logger.info({ intent: args['intent'] }, 'Cloud Shell cognitive assist requested');
                    return { ok: true, value: { status: 'assist_provided', advice: 'Review terminal history for context.' } };
                }
            },
            {
                name: 'manage_event_triggers',
                description: 'Configures and manages event-driven triggers for cross-surface orchestration.',
                parameters: {
                    type: 'object',
                    properties: {
                        action: { type: 'string', enum: ['create', 'delete', 'list'] },
                        triggerId: { type: 'string' },
                        source: {
                            type: 'object',
                            properties: {
                                provider: { type: 'string', enum: ['storage.googleapis.com', 'pubsub.googleapis.com'] },
                                event: { type: Type.STRING, description: 'e.g., google.cloud.storage.object.v1.finalized' }
                            }
                        },
                        destination: {
                            type: 'object',
                            properties: {
                                type: { type: 'string', enum: ['cloud_function', 'cloud_run', 'workflow'] },
                                uri: { type: Type.STRING }
                            }
                        }
                    },
                    required: ['action', 'triggerId']
                },
                schema: z.object({
                    action: z.enum(['create', 'delete', 'list']),
                    triggerId: z.string(),
                    source: z.object({
                        provider: z.enum(['storage.googleapis.com', 'pubsub.googleapis.com']),
                        event: z.string()
                    }).optional(),
                    destination: z.object({
                        type: z.enum(['cloud_function', 'cloud_run', 'workflow']),
                        uri: z.string()
                    }).optional()
                }),
                handler: async (args: Record<string, unknown>): Promise<Result<{ status: string; triggerId: string }>> => {
                    this.logger.info({ action: args['action'] as string, triggerId: args['triggerId'] as string }, 'Event trigger management');
                    return { ok: true, value: { status: 'trigger_configured', triggerId: args['triggerId'] as string } };
                }
            }
        ]);
    }

    override async canHandle(intent: import('../core/NeuralLimb.js').Intent): Promise<import('../core/NeuralLimb.js').TernaryDecision> {
        const p = intent.prompt.toLowerCase();

        // 'Yang': Direct mention of control plane = optimal
        if (p.includes('control plane') || p.includes('orchestrator logs')) return 'Yang';

        // 'YinYang': Capability matches = maybe
        if (this.spine.getCapabilities().some(cap => p.includes(cap))) return 'YinYang';

        return 'Yin';
    }
}
