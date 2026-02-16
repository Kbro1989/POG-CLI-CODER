import { HealthReport, ServiceHealthState } from './models.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';

const execAsync = promisify(exec);
const logger = pino({
    name: 'HealthRegistry',
    base: { hostname: 'POG-VIBE' }
});

export type HealthProvider = () => HealthReport;

/**
 * HealthRegistry - Centralized health tracking for Sovereign Intelligence Substrate
 * 
 * Allows Limbs and Services to register their health status providers.
 * The Router uses this to dynamically sense "RATE_LIMITED" states.
 */
export class HealthRegistry {
    private static instance: HealthRegistry;
    private readonly providers: Map<string, HealthProvider> = new Map();

    private constructor() { }

    public static getInstance(): HealthRegistry {
        if (!HealthRegistry.instance) {
            HealthRegistry.instance = new HealthRegistry();
        }
        return HealthRegistry.instance;
    }

    /**
     * Register a health provider for a service
     */
    public registerProvider(serviceId: string, provider: HealthProvider): void {
        this.providers.set(serviceId, provider);
    }

    /**
     * Get health report for a specific service
     */
    public getHealth(serviceId: string): HealthReport {
        const provider = this.providers.get(serviceId);
        if (provider) {
            return provider();
        }

        // Default to READY if no provider registered
        return { state: 'READY', cooldownSeconds: 0 };
    }

    /**
     * Get all registered health reports
     */
    public getAllHealth(): Record<string, HealthReport> {
        const reports: Record<string, HealthReport> = {};
        for (const [id, provider] of this.providers.entries()) {
            reports[id] = provider();
        }
        return reports;
    }

    /**
     * Audit External Dependencies — Environment Probe
     * 
     * Probes key external dependencies using real process calls
     * to determine which tools are available and healthy.
     * 
     * Mapped to Hexagram Line 4 (External Environment / Dependencies):
     *  - All healthy:    YoungYang (⚊ Stable environment)
     *  - Some degraded:  OldYang   (◯ Moving — partial outage)
     *  - Critical:       OldYin    (✕ Moving — environment hostile)
     */
    public async auditExternalDeps(): Promise<Record<string, ServiceHealthState>> {
        const probes: Record<string, string> = {
            ollama: 'ollama list',
            npm: 'npm --version',
            git: 'git --version',
            node: 'node --version'
        };

        const results: Record<string, ServiceHealthState> = {};

        for (const [name, cmd] of Object.entries(probes)) {
            try {
                await execAsync(cmd, { timeout: 5000 });
                results[name] = 'READY';
            } catch {
                results[name] = 'CRITICAL_FAILURE';
                logger.warn({ dependency: name, command: cmd }, 'External dependency probe failed');
            }
        }

        // Summary logging
        const readyCount = Object.values(results).filter(s => s === 'READY').length;
        const totalCount = Object.keys(results).length;
        logger.info({ readyCount, totalCount, results }, 'External dependency audit complete');

        return results;
    }
}
