import { HealthReport } from './models.js';

export type HealthProvider = () => HealthReport;

/**
 * HealthRegistry - Centralized health tracking for Sovereign Intelligence Substrate
 * 
 * Allows Limbs and Services to register their health status providers.
 * The Router uses this to dynamically sense "RATE_LIMITED" states.
 */
export class HealthRegistry {
    private static instance: HealthRegistry;
    private providers: Map<string, HealthProvider> = new Map();

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
}
