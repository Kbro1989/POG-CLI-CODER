/**
 * TSC Monitor - Continuous TypeScript Compiler Watcher
 * 
 * Runs `tsc --watch --noEmit` and reports errors to the MonitorAgent
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import pino from 'pino';

const logger = pino({
    name: 'TSCMonitor',
    base: { hostname: 'POG-VIBE' }
});

export interface TSCError {
    readonly file: string;
    readonly line: number;
    readonly column: number;
    readonly code: string;
    readonly message: string;
    readonly severity: 'error' | 'warning';
}

export interface TSCMonitorEvents {
    errorsDetected: (errors: TSCError[]) => void;
    buildSuccess: () => void;
    watchStarted: () => void;
}

export class TSCMonitor extends EventEmitter {
    private tscProcess: ChildProcess | undefined;
    private currentErrors: TSCError[] = [];

    constructor(private readonly projectRoot: string) {
        super();
    }

    override on<K extends keyof TSCMonitorEvents>(
        event: K,
        listener: TSCMonitorEvents[K]
    ): this {
        return super.on(event, listener);
    }

    override emit<K extends keyof TSCMonitorEvents>(
        event: K,
        ...args: Parameters<TSCMonitorEvents[K]>
    ): boolean {
        return super.emit(event, ...args);
    }

    start(): void {
        logger.info({ projectRoot: this.projectRoot }, 'Starting TSC Watch Mode');

        this.tscProcess = spawn('tsc', ['--watch', '--noEmit'], {
            cwd: this.projectRoot,
            shell: true
        });

        let buffer = '';

        this.tscProcess.stdout?.on('data', (data) => {
            buffer += data.toString();

            // TSC outputs a compilation summary after each check
            if (buffer.includes('Found 0 errors')) {
                this.currentErrors = [];
                this.emit('buildSuccess');
                buffer = '';
            } else if (buffer.includes('Found') && buffer.includes('error')) {
                this.parseErrors(buffer);
                buffer = '';
            }
        });

        this.tscProcess.stderr?.on('data', (data) => {
            logger.warn({ stderr: data.toString() }, 'TSC stderr');
        });

        this.tscProcess.on('error', (error) => {
            logger.error({ error }, 'TSC process error');
        });

        this.emit('watchStarted');
    }

    private parseErrors(output: string): void {
        const errors: TSCError[] = [];
        const errorRegex = /(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS(\d+):\s+(.+)/g;

        let match;
        while ((match = errorRegex.exec(output)) !== null) {
            errors.push({
                file: match[1]!.trim(),
                line: parseInt(match[2]!, 10),
                column: parseInt(match[3]!, 10),
                code: `TS${match[5]}`,
                message: match[6]!.trim(),
                severity: match[4] as 'error' | 'warning'
            });
        }

        if (errors.length > 0) {
            this.currentErrors = errors;
            this.emit('errorsDetected', errors);
            logger.debug({ errorCount: errors.length }, 'TSC errors detected');
        }
    }

    getCurrentErrors(): readonly TSCError[] {
        return this.currentErrors;
    }

    stop(): void {
        if (this.tscProcess) {
            this.tscProcess.kill();
            this.tscProcess = undefined;
            logger.info('TSC Monitor stopped');
        }
    }
}
