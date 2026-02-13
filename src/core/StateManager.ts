import pino from 'pino';

const logger = pino({
    name: 'StateManager',
    base: { hostname: 'POG-VIBE' }
});

export interface AppMetrics {
    tokens: number;
    cost: number;
    latency: number;
    turnCount: number;
}

export interface PersistentState {
    mode: 'online' | 'offline' | 'hybrid';
    selectedWorkspace: string | null;
    lastAction: string | null;
    metrics: AppMetrics;
}

/**
 * StateManager - Centralized substrate for metrics and persistent context.
 * 
 * Tracks global performance indicators and maintains consistency across
 * sovereign limb operations.
 */
export class StateManager {
    private static instance: StateManager;
    private readonly state: PersistentState;

    private constructor() {
        this.state = {
            mode: 'hybrid',
            selectedWorkspace: null,
            lastAction: null,
            metrics: {
                tokens: 0,
                cost: 0,
                latency: 0,
                turnCount: 0
            }
        };
        logger.info('StateManager initialized with hybrid defaults');
    }

    public static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    /**
     * Update global execution metrics
     */
    public updateMetrics(delta: Partial<AppMetrics>): void {
        this.state.metrics = {
            ...this.state.metrics,
            tokens: this.state.metrics.tokens + (delta.tokens || 0),
            cost: this.state.metrics.cost + (delta.cost || 0),
            latency: this.state.metrics.latency + (delta.latency || 0),
            turnCount: this.state.metrics.turnCount + (delta.turnCount || 0)
        };
        logger.debug({ metrics: this.state.metrics }, 'Registry metrics updated');
    }

    /**
     * Set the current active workspace
     */
    public setWorkspace(workspaceId: string | null): void {
        this.state.selectedWorkspace = workspaceId;
        logger.info({ workspaceId }, 'Active workspace shifted');
    }

    /**
     * Get the current global state
     */
    public getState(): Readonly<PersistentState> {
        return { ...this.state };
    }

    /**
     * Reset metrics for a new session
     */
    public resetMetrics(): void {
        this.state.metrics = {
            tokens: 0,
            cost: 0,
            latency: 0,
            turnCount: 0
        };
        logger.info('Registry metrics reset for new session');
    }
}
