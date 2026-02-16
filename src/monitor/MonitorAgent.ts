/**
 * Monitor Agent - Background Helper using Small Local Models
 * 
 * Uses tinyllama for continuous low-resource monitoring
 * and qwen2.5-coder:7b for project snapshot awareness.
 * 
 * Acts like Google's Script Editor helper - always watching,
 * reporting to top models when intervention needed.
 */

import { EventEmitter } from 'events';
import pino from 'pino';
import { TSCMonitor, TSCError } from './TSCMonitor.js';
import { ASTWatcher } from '../watcher/ASTWatcher.js';
import { ModelExecutor } from '../core/ModelExecutor.js';
import { HealthRegistry } from '../core/HealthRegistry.js';
import { SystemEnvChecker } from '../utils/SystemEnvChecker.js';
import { SelfHealingEngine, ExecutionPlan } from './SelfHealingEngine.js';
import { PulseMonitor } from './PulseMonitor.js';
import { HexagramManager } from '../core/HexagramManager.js';
import type { VibeConfig, CognitiveChoice } from '../core/models.js';
import { BuildStatus, HealthStatus } from '../core/models.js';

const logger = pino({
    name: 'MonitorAgent',
    base: { hostname: 'POG-VIBE' }
});

export interface MonitorAgentEvents {
    issueDetected: (report: MonitorReport) => void;
    healthCheckPassed: () => void;
    provenanceCandidate: (filePath: string) => void;
    node_discovered: (data: unknown) => void;
}

export interface MonitorReport {
    readonly timestamp: number;
    readonly severity: 'low' | 'medium' | 'high' | 'critical';
    readonly category: 'tsc' | 'file-change' | 'build-failure';
    readonly description: string;
    readonly affectedFiles: string[];
    readonly suggestedAction: string;
    readonly tscErrors?: readonly TSCError[];
}

export class MonitorAgent extends EventEmitter {
    private readonly tscMonitor: TSCMonitor;
    private readonly astWatcher: ASTWatcher;
    private readonly selfHealingEngine: SelfHealingEngine;
    private readonly pulseMonitor: PulseMonitor;
    private isRunning: boolean = false;
    private healthCheckInterval?: NodeJS.Timeout;
    private readonly recentChanges: Set<string> = new Set();

    private readonly MONITOR_MODEL: string;
    private readonly SNAPSHOT_MODEL: string;

    constructor(
        config: VibeConfig,
        private readonly executor: ModelExecutor,
        hexagramManager: HexagramManager
    ) {
        super();
        this.MONITOR_MODEL = config.monitorModel || process.env['VIBE_MONITOR_MODEL'] || 'tinyllama:latest';
        this.SNAPSHOT_MODEL = config.snapshotModel || process.env['VIBE_SNAPSHOT_MODEL'] || 'qwen2.5-coder:7b-instruct-q4_K_M';
        this.tscMonitor = new TSCMonitor(config.projectRoot);
        this.astWatcher = new ASTWatcher(config);
        this.selfHealingEngine = new SelfHealingEngine(config.projectRoot, executor, hexagramManager, this.SNAPSHOT_MODEL);
        this.pulseMonitor = new PulseMonitor(config, hexagramManager);
    }

    /**
     * Get the current set of TSC errors for health monitoring.
     */
    public getCurrentErrors(): readonly TSCError[] {
        return this.tscMonitor.getCurrentErrors();
    }

    /**
     * Ingest external issues (e.g. from VS Code Extension) and trigger self-healing.
     */
    public reportExternalIssues(report: MonitorReport): void {
        logger.info({ category: report.category, files: report.affectedFiles }, 'External issue reported from IDE');
        this.emit('issueDetected', report);
    }

    override on<K extends keyof MonitorAgentEvents>(
        event: K,
        listener: MonitorAgentEvents[K]
    ): this {
        return super.on(event, listener);
    }

    override emit<K extends keyof MonitorAgentEvents>(
        event: K,
        ...args: Parameters<MonitorAgentEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    start(): void {
        if (this.isRunning) {
            logger.warn('Monitor Agent already running');
            return;
        }

        logger.info('Starting Monitor Agent with local models');
        this.isRunning = true;

        // Start TSC continuous watch
        this.tscMonitor.start();
        this.tscMonitor.on('errorsDetected', (errors) => {
            this.handleTSCErrors(errors);
        });

        this.tscMonitor.on('buildSuccess', () => {
            this.handleBuildSuccess();
        });

        // Start file system watcher
        this.astWatcher.initialize();
        this.astWatcher.on('fileChanged', ({ filePath, hasStructuralChange }) => {
            if (hasStructuralChange) {
                this.handleFileChange(filePath);
            }
        });

        // Periodic health check (every 5 minutes)
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, 300000);

        logger.info({
            monitorModel: this.MONITOR_MODEL,
            snapshotModel: this.SNAPSHOT_MODEL
        }, 'Monitor Agent active');

        // Start Biological Pulse
        this.pulseMonitor.start();
    }

    public handleGodHeadConnection(pogContext: string): void {
        logger.info({ contextLength: pogContext.length }, 'God Head Connected via VS Code Extension');

        // Assimilate God Head Context into the Self-Healing Engine
        this.selfHealingEngine.setGodHeadContext(pogContext);

        this.emit('node_discovered', { type: 'god_head', status: 'active', source: 'vscode' });
    }

    private async handleTSCErrors(errors: readonly TSCError[]): Promise<void> {
        logger.warn({ errorCount: errors.length }, 'TSC errors detected, analyzing...');

        // Use tinyllama for quick severity classification
        const prompt = `Analyze these TypeScript errors and classify severity (low/medium/high/critical).
Errors:
${errors.map(e => `- ${e.file}:${e.line} [${e.code}] ${e.message}`).join('\n')}

Respond with ONLY: low, medium, high, or critical`;

        const result = await this.executor.callModel(this.MONITOR_MODEL, prompt);

        if (!result.ok) {
            const error = (result as { ok: false; error: Error }).error;
            logger.error({ error }, 'Monitor model failed');
            return;
        }

        const severity = result.value.response.trim().toLowerCase() as MonitorReport['severity'];

        const report: MonitorReport = {
            timestamp: Date.now(),
            severity: severity || 'medium',
            category: 'tsc',
            description: `TypeScript compilation has ${errors.length} error(s)`,
            affectedFiles: [...new Set(errors.map(e => e.file))],
            suggestedAction: 'Review and fix type errors in affected files',
            tscErrors: errors
        };

        this.emit('issueDetected', report);
    }

    private handleBuildSuccess(): void {
        if (this.recentChanges.size > 0) {
            logger.info({ count: this.recentChanges.size }, 'Build success! Processing candidates for Neural Harvest...');
            for (const filePath of this.recentChanges) {
                this.emit('provenanceCandidate', filePath);
            }
            this.recentChanges.clear();
        }
    }

    private async handleFileChange(filePath: string): Promise<void> {
        logger.debug({ filePath }, 'Structural file change detected');
        this.recentChanges.add(filePath);

        // Use qwen2.5-coder:7b for context-aware analysis
        const prompt = `File changed: ${filePath}
This is a structural change. Should we:
1. Re-run TSC to check for new errors?
2. Trigger a full build?
3. Just log and ignore?

Respond with ONLY: tsc, build, or ignore`;

        const result = await this.executor.callModel(this.SNAPSHOT_MODEL, prompt);

        if (result.ok) {
            const action = result.value.response.trim().toLowerCase();

            if (action === 'tsc' || action === 'build') {
                const report: MonitorReport = {
                    timestamp: Date.now(),
                    severity: 'low',
                    category: 'file-change',
                    description: `Structural change in ${filePath}`,
                    affectedFiles: [filePath],
                    suggestedAction: action === 'tsc' ? 'Re-check types' : 'Rebuild project'
                };

                this.emit('issueDetected', report);
            }
        }
    }

    private async performHealthCheck(): Promise<void> {
        // 1. Check TSC Errors
        const currentErrors = this.tscMonitor.getCurrentErrors();
        if (currentErrors.length > 0) {
            logger.debug({ errorCount: currentErrors.length }, 'Health check: TSC issues present');
        }

        // 2. Check Service Health via Registry
        const registry = HealthRegistry.getInstance();
        const services = ['gemini', 'cloudflare', 'sovereign-shell'];

        for (const serviceId of services) {
            const health = registry.getHealth(serviceId);
            // Map ServiceHealthState to ternary HealthStatus
            const serviceHealth = health.state === 'READY'
                ? HealthStatus.Ready
                : health.state === 'CRITICAL_FAILURE'
                    ? HealthStatus.Critical
                    : HealthStatus.Degraded;

            if (serviceHealth !== HealthStatus.Ready) {
                const report: MonitorReport = {
                    timestamp: Date.now(),
                    severity: serviceHealth === HealthStatus.Critical ? 'critical' : 'high',
                    category: 'build-failure',
                    description: `Sovereign Substrate Alert: Service [${serviceId}] is ${health.state}`,
                    affectedFiles: [],
                    suggestedAction: health.cooldownSeconds > 0
                        ? `Wait for cooldown (${health.cooldownSeconds}s) or use local fallback`
                        : 'Check API credentials or PATH configuration'
                };
                this.emit('issueDetected', report);
            }
        }

        // 3. Check CLI Tool Readiness
        const envStatus = await SystemEnvChecker.checkGlobalSettings();
        const missingCLIs = envStatus.filter(s => s.source === 'path' && !s.active);

        if (missingCLIs.length > 0) {
            const report: MonitorReport = {
                timestamp: Date.now(),
                severity: 'medium',
                category: 'build-failure',
                description: `Missing Fallback Tools: ${missingCLIs.map(s => s.key).join(', ')}`,
                affectedFiles: [],
                suggestedAction: 'Install missing CLI tools or verify they are in your system PATH'
            };
            this.emit('issueDetected', report);
        }

        if (currentErrors.length === 0 && missingCLIs.length === 0) {
            this.emit('healthCheckPassed');
            logger.debug('Health check: All systems green');
        }
    }

    /**
     * Proactively diagnose the current substrate state.
     * Returns a semantic decision: 'Yin' (Critical), 'YinYang' (Patch), 'Yang' (Continue)
     */
    async diagnoseState(plan?: ExecutionPlan): Promise<{ decision: CognitiveChoice; reasoning: string }> {
        const errors = this.tscMonitor.getCurrentErrors();
        if (errors.length === 0) {
            return { decision: BuildStatus.Passed, reasoning: 'Substrate healthy. Zero TSC errors detected.' };
        }

        // Diagnosing the first error found (usually the primary blocker)
        return await this.selfHealingEngine.diagnose(errors[0]!, plan);
    }

    /**
     * Executes a full Metabolic Boot sequence:
     * 1. Health Audit (APIs/MCPs)
     * 2. TSC Type Check
     * 3. Self-Testing (npm test)
     * 4. Outcome Analysis & Healing
     */
    public async runMetabolicBoot(): Promise<{ ok: boolean; message: string }> {
        logger.info('Initiating Sovereign Metabolic Boot...');

        // 1. Check Substrate (Disk/Biological)
        await this.pulseMonitor.start(); // Ensure pulse is running

        // 2. TSC Check
        const tscErrors = this.tscMonitor.getCurrentErrors();
        if (tscErrors.length > 0) {
            logger.warn({ count: tscErrors.length }, 'Metabolic regression detected: TSC Errors present.');
            return { ok: false, message: `TSC check failed with ${tscErrors.length} errors.` };
        }

        // 3. Self-Testing
        logger.info('Running Sovereign Self-Tests (npm test)...');
        const testResult = await this.selfHealingEngine.verifyWithTests(this.tscMonitor.getProjectRoot());
        if (!testResult.ok) {
            logger.warn('Metabolic regression detected: Self-Tests failed.');
            return { ok: false, message: `Self-tests failed.\n${testResult.output.slice(-500)}` };
        }

        logger.info('Sovereign Metabolic Boot: ALL SYSTEMS GREEN.');
        return { ok: true, message: 'Substrate verified and healthy.' };
    }

    /**
     * Executes npm test and reports results.
     */
    public async runSelfTests(): Promise<{ ok: boolean; message: string }> {
        // Delegate to SelfHealingEngine to ensure consistent output redirection
        const result = await this.selfHealingEngine.verifyWithTests(this.tscMonitor.getProjectRoot());
        return {
            ok: result.ok,
            message: result.ok ? 'Self-tests passed.' : `Self-tests failed.\n${result.output.slice(-500)}`
        };
    }



    /**
     * Internal interference check for the Orchestrator loop.
     */
    async checkInterference(plan?: ExecutionPlan): Promise<{ decision: CognitiveChoice; reasoning: string } | null> {
        const result = await this.diagnoseState(plan);
        if (result.decision === BuildStatus.Passed) return null; // No interference
        return result;
    }

    stop(): void {
        if (!this.isRunning) return;

        logger.info('Stopping Monitor Agent');
        this.isRunning = false;

        this.tscMonitor.stop();
        this.astWatcher.stop();
        this.pulseMonitor.stop();

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.removeAllListeners();
    }

    isActive(): boolean {
        return this.isRunning;
    }
}
