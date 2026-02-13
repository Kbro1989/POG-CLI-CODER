import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision, NeuralLimb } from './NeuralLimb.js';
import type { Result, VibeConfig, CognitiveChoice } from '../../core/models.js';
import { HealthStatus } from '../../core/models.js';

/**
 * GhostLimb - The Deterministic "Top Brain" Substitute.
 * 
 * CAPABILITY: Provides high-fidelity, hand-written logic and UI components.
 * SUBSERVIENCE: +1 (Control), 0 (Validate), -1 (Passive)
 */
export class GhostLimb extends BaseLimb implements NeuralLimb {
    public id = 'ghost';
    public type = 'system' as const;
    public override get capabilities(): string[] {
        return ['deterministic_logic', 'sovereign_voice', 'failover_control'];
    }

    private readonly localCapabilities: Map<string, boolean> = new Map();
    private _engagementLevel: CognitiveChoice = 'Yin'; // 'Yin' (Passive), 'YinYang' (Validate), 'Yang' (Control)
    private ghostNarrative = 'Substrate steady. Ghost standing by for failover.';
    private readonly cloudHealthHistory: HealthStatus[] = []; // Last 5 cloud states

    public get engagementLevel(): CognitiveChoice {
        return this._engagementLevel;
    }

    constructor(config: VibeConfig, executor?: unknown) {
        super(config, executor as import('../../core/ModelExecutor.js').ModelExecutor);
        this.detectLocalCapabilities();
    }

    /**
     * TERNARY FAILOVER: Updates the Ghost's engagement level based on cloud health.
     */
    public reportCloudHealth(success: boolean): void {
        const state = success ? HealthStatus.Ready : HealthStatus.Critical;
        this.cloudHealthHistory.push(state);
        if (this.cloudHealthHistory.length > 5) this.cloudHealthHistory.shift();

        // LOGIC: If 3 out of last 5 failed, take control ('Yang')
        const failures = this.cloudHealthHistory.filter(h => h === HealthStatus.Critical).length;
        if (failures >= 3 && this._engagementLevel !== 'Yang') {
            this._engagementLevel = 'Yang'; // Take control
            this.logger.warn({ failures }, 'TERNARY ESCALATION: Ghost Limb taking master control (Yang)');
        } else if (failures > 0 && failures < 3 && this._engagementLevel === 'Yin') {
            this._engagementLevel = 'YinYang'; // Validate mode
            this.logger.info({ failures }, 'TERNARY SHIFT: Ghost Limb entering validation mode (YinYang)');
        } else if (failures === 0 && this._engagementLevel !== 'Yin') {
            this._engagementLevel = 'Yin'; // Passive mode
            this.logger.info('TERNARY RECOVERY: Substrate stable. Ghost returning to passive (Yin)');
        }

        // Update narrative base on state
        this.ghostNarrative = this.engagementLevel === 'Yang'
            ? 'The Ghost is in control. Cloud silence is absolute.'
            : 'Substrate steady. Ghost standing by for failover.';
    }

    /**
     * DETERMINISTIC NARRATIVE: Generates a system voice without cloud dependency.
     */
    public generateLocalNarrative(metrics: { cpu: number; mem: number }): string {
        const state = this.engagementLevel === 'Yang' ? 'COMMAND_ACTIVE' : 'WATCHING';
        const load = metrics.cpu > 70 ? 'HIGH_LOAD' : 'NOMINAL';
        return `[GHOST_VOICE][${state}][${load}] Substrate metrics: CPU ${metrics.cpu}%, MEM ${metrics.mem}%. ${this.ghostNarrative}`;
    }

    /**
     * SOVEREIGN INTENT: Determines if the Ghost can handle the request locally.
     */
    public override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const prompt = intent.prompt.toLowerCase();

        // 1. Critical failover override
        if (this.engagementLevel === 'Yang') return 'Yang';

        // 2. High-fidelity hand-written logic patterns
        if (prompt.includes('reset') || prompt.includes('emergency')) return 'Yang';

        // 3. Validation patterns
        if (prompt.includes('status') || prompt.includes('vibe')) return 'YinYang';

        return 'Yin'; // Yield to other limbs
    }

    /**
     * SOVEREIGN EXECUTION: Primary entry point for deterministic logic.
     */
    public override async execute(intent: Intent): Promise<Result<Execution>> {
        this.logger.info({ prompt: intent.prompt }, 'Ghost executing deterministic logic');

        return {
            ok: true,
            value: {
                output: `GHOST_EXECUTION: ${intent.prompt.toUpperCase()}`,
                data: {
                    id: `ghost-${Date.now()}`,
                    type: 'system',
                    query: intent.prompt,
                    confidence: 1.0,
                    executionTime: 5,
                    ghost_state: this.engagementLevel,
                    deterministic: true
                }
            }
        };
    }

    public override getTools(): import('./NeuralLimb.js').ToolDeclaration[] {
        return [];
    }

    public override getStatus(): Record<string, unknown> {
        return {
            id: this.id,
            engagementLevel: this.engagementLevel,
            cloudHealth: this.cloudHealthHistory,
            localCapabilities: Array.from(this.localCapabilities.entries())
        };
    }

    private detectLocalCapabilities(): void {
        this.localCapabilities.set('ollama', true);
        this.localCapabilities.set('code_generation', true);
    }

    public async getSystemStatus(_verbose: boolean): Promise<{
        status: string;
        ternary: TernaryDecision;
        message: string;
        cloudHealthHistory: HealthStatus[];
        engagementLevel: TernaryDecision;
    }> {
        return {
            status: this._engagementLevel === 'Yang' ? 'GHOST_CONTROL' :
                this._engagementLevel === 'YinYang' ? 'VALIDATION_MODE' : 'PASSIVE_MONITORING',
            ternary: this._engagementLevel as TernaryDecision,
            message: this._engagementLevel === 'Yang'
                ? '=== GHOST +1: FULL DETERMINISTIC CONTROL ===\nCloud substrate: OFFLINE\nLocal substrate: ACTIVE'
                : this._engagementLevel === 'YinYang'
                    ? '=== GHOST 0: VALIDATION MODE ===\nCloud substrate: UNCERTAIN\nGhost validating all outputs'
                    : '=== GHOST -1: PASSIVE MONITORING ===\nCloud substrate: HEALTHY\nGhost observing only',
            cloudHealthHistory: this.cloudHealthHistory,
            engagementLevel: this._engagementLevel as TernaryDecision
        };
    }
}