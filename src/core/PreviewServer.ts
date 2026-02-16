import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';
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
    private readonly activePreviews: Map<string, {
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
            child.on('error', (err) => {
                logger.error({ projectName, error: err.message }, 'Dev server spawn error');
            });

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

                // Auto-open in browser (Windows)
                if (process.platform === 'win32') {
                    spawn('start', [metadata.url!], { shell: true });
                }
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

    private readonly isWindows = process.platform === 'win32';

    private killProcessTree(child: ChildProcess): void {
        if (!child.pid) return;

        if (this.isWindows) {
            logger.info({ pid: child.pid }, 'Killing process tree on Windows');
            spawn('taskkill', ['/f', '/t', '/pid', String(child.pid)], { shell: true });
        } else {
            child.kill('SIGKILL');
        }
    }

    async killProcessByPort(port: number): Promise<void> {
        if (process.platform !== 'win32') {
            // macOS/Linux implementation if needed: lsof -ti:port | xargs kill -9
            return;
        }

        try {
            const execAsync = promisify(exec);
            const { stdout } = await execAsync(`netstat -ano | findstr :${port} | findstr LISTENING`);
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') {
                    logger.info({ port, pid }, 'Killing process on port');
                    await execAsync(`taskkill /F /PID ${pid} /T`);
                }
            }
        } catch (error) {
            logger.debug({ port }, 'No process found on port to kill');
        }
    }

    async isPogService(port: number): Promise<boolean> {
        try {
            const response = await fetch(`http://localhost:${port}`, { signal: AbortSignal.timeout(2000) });
            const text = await response.text();
            return text.includes('POG-VIBE') || text.includes('POG-CODER-VIBE');
        } catch {
            return false;
        }
    }

    async findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
        let port = startPort;
        for (let i = 0; i < maxAttempts; i++) {
            if (!(await this.isPortActive(port))) return port;
            port++;
        }
        throw new Error(`Could not find an available port after ${maxAttempts} attempts starting at ${startPort}`);
    }

    private async waitForPort(port: number, timeoutMs = 30000): Promise<boolean> {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (await this.isPortActive(port)) return true;
            await new Promise(r => setTimeout(r, 500));
        }
        return false;
    }

    public isPortActive(port: number): Promise<boolean> {
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
