
import { EventEmitter } from 'events';

export const PROVIDER_KEY = 'cloudflare';
export type CircuitStatus = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface ProviderState {
    failures: number;
    status: CircuitStatus;
    lastFailure: number;
    nextRetry: number;
}

/**
 * Sovereign Circuit Breaker
 * 
 * Enforces the "3-Strike" rule for cloud dependencies.
 * If a provider fails 3 times, it is "Soldiered" (Disabled) to prevent latency drag.
 * 
 * - CLOSED: Normal operation (Local -> Cloud)
 * - OPEN: Blocked (Local Only)
 * - HALF_OPEN: Testing recovery
 */
export class CircuitBreaker extends EventEmitter {
    private readonly states: Map<string, ProviderState> = new Map();
    private readonly STRIKE_LIMIT = 3;
    private readonly COOL_DOWN_MS = 300000; // 5 Minutes

    constructor() {
        super();
    }

    /**
     * Report a failure for a provider (Gemini, Cloudflare, etc.)
     */
    reportFailure(provider: string): void {
        const state = this.getState(provider);

        if (state.status === 'OPEN') return; // Already known bad

        state.failures++;
        state.lastFailure = Date.now();

        if (state.failures >= this.STRIKE_LIMIT) {
            this.openCircuit(provider);
        } else {
            this.emit('strike', { provider, strikes: state.failures, limit: this.STRIKE_LIMIT });
        }
    }

    /**
     * Report a success to reset the count (if recovering)
     */
    reportSuccess(provider: string): void {
        const state = this.getState(provider);

        if (state.status === 'HALF_OPEN') {
            this.closeCircuit(provider);
        } else if (state.status === 'CLOSED') {
            state.failures = 0; // Reset accidental strikes
        }
    }

    /**
     * Check if a provider is available
     */
    isOpen(provider: string): boolean {
        const state = this.getState(provider);

        if (state.status === 'OPEN') {
            // Check if cooldown has passed -> Move to HALF_OPEN
            if (Date.now() > state.nextRetry) {
                state.status = 'HALF_OPEN';
                this.emit('half_open', { provider });
                return false; // Allow one trial request
            }
            return true; // Still blocked
        }

        return false;
    }

    /**
     * Forcefully cut a provider (Manual Override or Offline Mode)
     */
    forceOpen(provider: string): void {
        this.openCircuit(provider);
    }

    /**
     * Private helpers
     */
    private getState(provider: string): ProviderState {
        if (!this.states.has(provider)) {
            this.states.set(provider, {
                failures: 0,
                status: 'CLOSED',
                lastFailure: 0,
                nextRetry: 0
            });
        }
        return this.states.get(provider)!;
    }

    private openCircuit(provider: string): void {
        const state = this.getState(provider);
        state.status = 'OPEN';
        state.nextRetry = Date.now() + this.COOL_DOWN_MS;
        this.emit('circuit_open', { provider, failures: state.failures, retryAt: new Date(state.nextRetry).toISOString() });
    }

    private closeCircuit(provider: string): void {
        const state = this.getState(provider);
        state.status = 'CLOSED';
        state.failures = 0;
        state.nextRetry = 0;
        this.emit('circuit_closed', { provider });
    }

    getStatusSnapshot(): Record<string, unknown> {
        const snapshot: Record<string, unknown> = {};
        for (const [key, val] of this.states.entries()) {
            snapshot[key] = {
                status: val.status,
                strikes: val.failures,
                retryIn: val.status === 'OPEN' ? Math.ceil((val.nextRetry - Date.now()) / 1000) + 's' : 0
            };
        }
        return snapshot;
    }
}
