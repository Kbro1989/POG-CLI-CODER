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
import type { VibeConfig } from '../core/models.js';

const logger = pino({
    name: 'MonitorAgent',
    base: { hostname: 'POG-VIBE' }
});

export interface MonitorAgentEvents {
    issueDetected: (report: MonitorReport) => void;
    healthCheckPassed: () => void;
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
    private tscMonitor: TSCMonitor;
    private astWatcher: ASTWatcher;
    private isRunning: boolean = false;
    private healthCheckInterval?: NodeJS.Timeout;

    // Models used for background auditing
    private readonly MONITOR_MODEL = process.env['VIBE_MONITOR_MODEL'] || 'tinyllama:latest';
    private readonly SNAPSHOT_MODEL = process.env['VIBE_SNAPSHOT_MODEL'] || 'qwen2.5-coder:7b-instruct-q4_K_M';

    constructor(
        config: VibeConfig,
        private readonly executor: ModelExecutor
    ) {
        super();
        this.tscMonitor = new TSCMonitor(config.projectRoot);
        this.astWatcher = new ASTWatcher(config);
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
            logger.error({ error: result.error }, 'Monitor model failed');
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

    private async handleFileChange(filePath: string): Promise<void> {
        logger.debug({ filePath }, 'Structural file change detected');

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
        const currentErrors = this.tscMonitor.getCurrentErrors();

        if (currentErrors.length === 0) {
            this.emit('healthCheckPassed');
            logger.debug('Health check: All systems green');
        } else {
            logger.debug({ errorCount: currentErrors.length }, 'Health check: Issues present');
        }
    }

    stop(): void {
        if (!this.isRunning) return;

        logger.info('Stopping Monitor Agent');
        this.isRunning = false;

        this.tscMonitor.stop();
        this.astWatcher.stop();

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }

        this.removeAllListeners();
    }

    isActive(): boolean {
        return this.isRunning;
    }
}
