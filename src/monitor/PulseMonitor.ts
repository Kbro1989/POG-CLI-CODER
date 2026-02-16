import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import pino from 'pino';
import { join } from 'path';
import { existsSync } from 'fs';
import { HexagramManager } from '../core/HexagramManager.js';
import { VibeConfig, YaoState } from '../core/models.js';
import { hasSovereignDrive, getSovereignRoot } from '../utils/SovereignPathResolver.js';

const logger = pino({
    name: 'PulseMonitor',
    base: { hostname: 'POG-VIBE' }
});

export interface SubstrateHealth {
    diskPath: string;
    totalGB: number;
    freeGB: number;
    usedGB: number;
    usagePercent: number;
}

/**
 * PulseMonitor - Biological Health & Substrate Awareness
 * 
 * Monitors D:\ memory allocation and runs periodic health test scripts.
 * Pulses findings to the Hexagram nervous system.
 */
export class PulseMonitor extends EventEmitter {
    private isRunning: boolean = false;
    private monitorInterval?: NodeJS.Timeout;
    private readonly projectRoot: string;

    constructor(
        config: VibeConfig,
        private readonly hexagramManager: HexagramManager
    ) {
        super();
        this.projectRoot = config.projectRoot;
    }

    public async start(): Promise<void> {
        if (this.isRunning) return;
        this.isRunning = true;
        logger.info('PulseMonitor: Biological heart rate established.');

        // Initial check
        await this.pulse();

        // Every 3 minutes
        this.monitorInterval = setInterval(() => this.pulse(), 180000);
    }

    public stop(): void {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.isRunning = false;
        this.removeAllListeners();
    }

    private async pulse(): Promise<void> {
        logger.debug('PulseMonitor: Thump-thump.');

        // 1. Substrate Check (Sovereign Drive Disk Space)
        if (hasSovereignDrive()) {
            const diskHealth = await this.checkSubstrateHealth();
            if (diskHealth) {
                const root = getSovereignRoot();
                await this.hexagramManager.pinCard(
                    2,
                    'Substrate Allocation',
                    `${root} Capacity: ${diskHealth.usedGB.toFixed(1)}GB / ${diskHealth.totalGB.toFixed(1)}GB used (${diskHealth.usagePercent.toFixed(1)}%)`,
                    diskHealth.usagePercent > 90 ? YaoState.OldYin : YaoState.YoungYang
                );
            }
        } else {
            logger.debug('PulseMonitor: Sovereign drive not detected, skipping substrate health check.');
        }

        // 2. Health Script Check (Tests)
        await this.runHealthTests();
    }

    private async checkSubstrateHealth(): Promise<SubstrateHealth | null> {
        const root = getSovereignRoot();
        const driveLetter = root.split(':')[0] || 'D';

        return new Promise((resolve) => {
            const psScript = `Get-PSDrive ${driveLetter} | Select-Object Used, Free | ConvertTo-Json`;
            const child = spawn('powershell', ['-Command', psScript], { shell: true });
            let output = '';

            child.on('error', (err) => {
                logger.error({ err: err.message }, 'PulseMonitor: Substrate health check spawn error');
                resolve(null);
            });
            child.stdout.on('data', (data) => { output += data.toString(); });
            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const data = JSON.parse(output);
                        const used = (data.Used || 0) / (1024 * 1024 * 1024);
                        const free = (data.Free || 0) / (1024 * 1024 * 1024);
                        const total = used + free;
                        resolve({
                            diskPath: root,
                            totalGB: total,
                            freeGB: free,
                            usedGB: used,
                            usagePercent: total > 0 ? (used / total) * 100 : 0
                        });
                    } catch (e) {
                        logger.error('Failed to parse disk health output');
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });
    }

    private async runHealthTests(): Promise<void> {
        const testsDir = join(this.projectRoot, 'tests');
        if (!existsSync(testsDir)) return;

        // Run health-check.ts as it's the most critical
        const healthCheckScript = join(testsDir, 'health-check.ts');
        if (existsSync(healthCheckScript)) {
            logger.info('PulseMonitor: Sensed health-check script, executing...');

            // Note: We use ts-node to run the test script directly
            const child = spawn('npx', ['ts-node', '--esm', healthCheckScript], { shell: true });

            child.on('error', (err) => {
                logger.error({ err: err.message }, 'PulseMonitor: Health check spawn error');
            });
            child.on('close', async (code) => {
                if (code === 0) {
                    await this.hexagramManager.pinCard(
                        4,
                        'Dependency Pulse',
                        'External cloud models and dependencies are responsive.',
                        YaoState.YoungYang
                    );
                } else {
                    await this.hexagramManager.pinCard(
                        4,
                        'Dependency Alert',
                        'Health check failed. Check Internet or API Keys.',
                        YaoState.OldYin
                    );
                }
            });
        }
    }
}
