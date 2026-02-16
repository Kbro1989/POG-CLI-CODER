import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision, NeuralLimb } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { HealthStatus } from '../../core/models.js';
import { CircuitBreaker } from '../../core/CircuitBreaker.js';
import { ModelExecutor } from '../../core/ModelExecutor.js';
import { ModelInventory } from '../../core/ModelInventory.js';
import { YaoState } from '../../core/models.js';
import { CognitiveTranslator } from '../../utils/CognitiveTranslator.js';

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
    private readonly cloudHealthHistory: HealthStatus[] = []; // Last 5 cloud states
    private _engagementLevel: YaoState = YaoState.YoungYin; // Passes as 'passive' monitor
    private ghostNarrative = 'Substrate steady. Ghost standing by for failover.';
    private readonly failureLog: string[] = []; // Memory of past failures

    private readonly circuitBreaker: CircuitBreaker;
    private readonly localModels: Map<string, string> = new Map();

    constructor(config: VibeConfig, executor?: ModelExecutor) {
        super(config, executor);
        this.circuitBreaker = executor?.circuitBreaker || new CircuitBreaker();
        this.detectLocalCapabilities();
        this.initializeSwarm();
    }

    /**
     * Returns the current engagement level as a TernaryDecision string.
     */
    public get engagementLevel(): TernaryDecision {
        return this._engagementLevel as unknown as TernaryDecision;
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

        // Use CognitiveTranslator to perceive the "Mental State" of the substrate
        const mentalState = CognitiveTranslator.translate(failures / 5, 'cloud_pressure');

        // Pulse circuit breaker stats to the nervous system
        if (this.circuitBreaker.isOpen('gemini')) {
            this.logger.debug('Ghost sensing circuit open state for cloud provider');
        }

        if (failures >= 3 && this._engagementLevel !== YaoState.OldYang) {
            const oldLevel = this._engagementLevel;
            this._engagementLevel = YaoState.OldYang; // Take control
            this.logger.warn({ failures, mentalState }, 'TERNARY ESCALATION: Ghost Limb taking master control (Yang)');
            this.emit('engagementChanged', { old: oldLevel, new: YaoState.OldYang, reason: 'Cloud failures >= 3' });
            this.rememberFailure('Cloud substrate critical. Multiple failures detected.');
        } else if (failures > 0 && failures < 3 && this._engagementLevel === YaoState.YoungYin) {
            const oldLevel = this._engagementLevel;
            this._engagementLevel = YaoState.YoungYang; // Validate mode (approximated)
            this.logger.info({ failures, mentalState }, 'TERNARY SHIFT: Ghost Limb entering validation mode (YinYang)');
            this.emit('engagementChanged', { old: oldLevel, new: YaoState.YoungYang, reason: 'Partial cloud instability' });
        } else if (failures === 0 && this._engagementLevel !== YaoState.YoungYin) {
            const oldLevel = this._engagementLevel;
            this._engagementLevel = YaoState.YoungYin; // Passive mode
            this.logger.info('TERNARY RECOVERY: Substrate stable. Ghost returning to passive (Yin)');
            this.emit('engagementChanged', { old: oldLevel, new: YaoState.YoungYin, reason: 'Substrate recovery' });
        }

        // Update narrative base on state
        this.ghostNarrative = this.engagementLevel === 'Yang'
            ? 'The Ghost is in control. Cloud silence is absolute.'
            : (this._engagementLevel === YaoState.YoungYin ? 'Sovereign Silence. Swarm in receptive stasis.' : 'Substrate steady. Ghost standing by for failover.');
    }

    /**
     * SOVEREIGN SILENCE: Explicitly reports that the cloud is yielding to silence.
     */
    public reportSilence(): void {
        const oldLevel = this._engagementLevel;
        this.cloudHealthHistory.push(HealthStatus.Silence);
        if (this.cloudHealthHistory.length > 5) this.cloudHealthHistory.shift();

        // Silence = Receptive Yield (Young Yin)
        this._engagementLevel = YaoState.YoungYin;
        this.ghostNarrative = 'Sovereign Silence. The Cloud yields; the Swarm listens.';
        this.logger.info('SOVEREIGN SILENCE: Cloud yielding to local metabolism (Young Yin)');
        this.emit('engagementChanged', { old: oldLevel, new: YaoState.YoungYin, reason: 'Sovereign Silence directive' });
    }

    private rememberFailure(msg: string): void {
        this.failureLog.push(`[${new Date().toISOString()}] ${msg}`);
        if (this.failureLog.length > 20) this.failureLog.shift();
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

        // Identify task type and select best local model
        const taskType = intent.prompt.toLowerCase().includes('code') ? 'core_logic' : 'narrative';
        const model = this.getSwarmModel(taskType);

        try {
            // DIRECT OLLAMA SPAWN (Circumventing ModelExecutor to avoid circular fallback interactions)
            const { spawn } = await import('child_process');

            this.logger.info({ model, taskType }, 'Ghost Limb invoking Local Swarm');

            const response = await new Promise<string>((resolve, reject) => {
                const child = spawn('ollama', ['run', model, intent.prompt], { shell: true });
                let out = '';
                let err = '';

                child.stdout.on('data', d => out += d.toString());
                child.stderr.on('data', d => err += d.toString());

                child.on('close', code => {
                    if (code === 0) resolve(out);
                    else reject(new Error(`Ollama failed: ${err}`));
                });
            });

            return {
                ok: true,
                value: {
                    output: response,
                    data: {
                        id: `ghost-${Date.now()}`,
                        type: 'system',
                        query: intent.prompt,
                        confidence: 1.0,
                        executionTime: 100, // Estimated
                        ghost_state: this.engagementLevel,
                        deterministic: false, // Actual AI generation
                        model
                    }
                }
            };
        } catch (error) {
            this.logger.error({ error }, 'Ghost Limb failed to summon Swarm');
            return {
                ok: false,
                error: error instanceof Error ? error : new Error(String(error))
            };
        }
    }

    /**
     * LOCAL SWARM: Maps specialized intent types to the best local model.
     */
    private initializeSwarm(): void {
        const available = ModelInventory.getAvailableModels(this.config);

        // High-Speed Brain (Fast reasoning, triage)
        const fastBrain = available.find(m => m.name.includes('qwen2.5') && m.name.includes('1.5b'))?.name || 'qwen2.5:1.5b';
        this.localModels.set('fast_triage', fastBrain);

        // Core Intelligence (Coding, structural logic)
        const coreBrain = available.find(m => m.name.includes('phi4') || m.name.includes('codestral'))?.name || 'phi4';
        this.localModels.set('core_logic', coreBrain);

        // Literary / Narrative Brain (Creative descriptions, tone)
        const narrativeBrain = available.find(m => m.name.includes('llama3') || m.name.includes('mistral'))?.name || 'llama3.2:3b';
        this.localModels.set('narrative', narrativeBrain);
    }

    public getSwarmModel(taskType: string): string {
        return this.localModels.get(taskType) || this.localModels.get('core_logic') || 'phi4';
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
            status: this._engagementLevel === YaoState.OldYang ? 'GHOST_CONTROL' :
                (this._engagementLevel === YaoState.YoungYang || this._engagementLevel === YaoState.OldYin) ? 'VALIDATION_MODE' : 'PASSIVE_MONITORING',
            ternary: this.engagementLevel,
            message: this._engagementLevel === YaoState.OldYang
                ? '=== GHOST +1: FULL DETERMINISTIC CONTROL ===\nCloud substrate: OFFLINE\nLocal substrate: ACTIVE'
                : (this._engagementLevel === YaoState.YoungYang || this._engagementLevel === YaoState.OldYin)
                    ? '=== GHOST 0: VALIDATION MODE ===\nCloud substrate: UNCERTAIN\nGhost validating all outputs'
                    : '=== GHOST -1: PASSIVE MONITORING ===\nCloud substrate: HEALTHY\nGhost observing only',
            cloudHealthHistory: this.cloudHealthHistory,
            engagementLevel: this.engagementLevel
        };
    }
}
