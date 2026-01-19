import { spawn, ChildProcess } from 'child_process';
import { NetConnectOpts, createConnection } from 'net';
import { EventEmitter } from 'events';
import pino from 'pino';
import type {
    Result
} from './models.js';

const logger = pino({
    name: 'PreviewServer',
    base: { hostname: 'POG-VIBE' }
});

export interface PreviewMetadata {
    readonly projectName: string;
    readonly port?: number;
    readonly url?: string;
    readonly type: 'web' | 'terminal';
    readonly pid: number;
    readonly projectPath: string;
}

export interface LogEntry {
    stream: 'stdout' | 'stderr' | 'system';
    text: string;
    timestamp: number;
}

export class PreviewServer extends EventEmitter {
    private activePreviews: Map<string, {
        process: ChildProcess;
        metadata: PreviewMetadata;
        logs: LogEntry[]
    }> = new Map();
    private readonly MAX_LOG_BUFFER = 1000;

    constructor() {
        super();
    }

    /**
     * Start a preview for a specific project
     */
    async startPreview(projectName: string, projectPath: string, devCommand: string, defaultPort?: number): Promise<Result<PreviewMetadata>> {
        try {
            logger.info({ projectName, projectPath, devCommand }, 'Starting project preview');

            // 1. Cleanup existing preview for this project if any
            if (this.activePreviews.has(projectName)) {
                await this.stopPreview(projectName);
            }

            // 2. Spawn the dev server/script
            const [cmd, ...args] = devCommand.split(/\s+/);
            if (!cmd) return { ok: false, error: new Error('Invalid dev command') };

            const child = spawn(cmd, args, {
                cwd: projectPath,
                shell: true,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            const previewLogs: LogEntry[] = [];
            const streamLogs = (data: Buffer, stream: 'stdout' | 'stderr') => {
                const text = data.toString();
                const entry: LogEntry = { stream, text, timestamp: Date.now() };

                previewLogs.push(entry);
                if (previewLogs.length > this.MAX_LOG_BUFFER) {
                    previewLogs.shift();
                }

                this.emit('log', { projectName, ...entry });
                if (stream === 'stderr') {
                    logger.warn({ projectName }, text);
                } else {
                    logger.debug({ projectName }, text);
                }
            };

            child.stdout?.on('data', (d) => streamLogs(d, 'stdout'));
            child.stderr?.on('data', (d) => streamLogs(d, 'stderr'));

            // 3. Determine if it's a web project (port-based) or terminal project
            let metadata: PreviewMetadata;

            if (defaultPort) {
                const isReady = await this.waitForPort(defaultPort);
                if (!isReady) {
                    this.killProcessTree(child);
                    return { ok: false, error: new Error(`Dev server failed to start on port ${defaultPort}`) };
                }
                metadata = {
                    projectName,
                    port: defaultPort,
                    url: `http://localhost:${defaultPort}`,
                    type: 'web',
                    pid: child.pid || 0,
                    projectPath
                };
            } else {
                metadata = {
                    projectName,
                    type: 'terminal',
                    pid: child.pid || 0,
                    projectPath
                };
            }

            this.activePreviews.set(projectName, { process: child, metadata, logs: previewLogs });

            child.on('exit', (code) => {
                logger.info({ projectName, code }, 'Process exited');
                this.emit('exit', { projectName, code: code ?? 0 });
                this.activePreviews.delete(projectName);
            });

            return { ok: true, value: metadata };

        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Stop an active preview
     */
    async stopPreview(projectName: string): Promise<void> {
        const entry = this.activePreviews.get(projectName);
        if (entry) {
            logger.info({ projectName }, 'Stopping preview');
            this.killProcessTree(entry.process);
            this.activePreviews.delete(projectName);
        }
    }

    /**
     * Stop all active previews (cleanup)
     */
    async stopAll(): Promise<void> {
        const projects = Array.from(this.activePreviews.keys());
        for (const project of projects) {
            await this.stopPreview(project);
        }
    }

    /**
     * Get active preview metadata
     */
    getActivePreviews(): PreviewMetadata[] {
        return Array.from(this.activePreviews.values()).map(e => e.metadata);
    }

    /**
     * Get recent logs for a project
     */
    getLogs(projectName: string): LogEntry[] {
        return this.activePreviews.get(projectName)?.logs ?? [];
    }

    private killProcessTree(child: ChildProcess): void {
        // Simple kill for now, but in a production environment we'd use tree-kill
        // to ensure deep process sub-trees are cleaned up.
        child.kill();
        // Fallback for Windows if needed: spawn('taskkill', ['/pid', String(child.pid), '/f', '/t']);
    }

    private async waitForPort(port: number, timeoutMs = 30000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (await this.isPortActive(port)) return true;
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    private isPortActive(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = createConnection({ port, host: 'localhost' } as NetConnectOpts);
            socket.on('connect', () => {
                socket.end();
                resolve(true);
            });
            socket.on('error', () => {
                resolve(false);
            });
        });
    }
}
