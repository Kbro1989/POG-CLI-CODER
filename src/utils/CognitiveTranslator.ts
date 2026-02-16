import { YaoState, Result, BuildStatus, HealthStatus } from '../core/models.js';

/**
 * GENETIC TRANSLATOR (Sovereign Language)
 * 
 * Maps raw substrate data (any/unknown) into high-fidelity YaoStates 
 * for the Hive-Mind Nervous System.
 * 
 * "We do not speak in nulls. We speak in States."
 */
export class CognitiveTranslator {
    /**
     * Translates an unknown expression into a specific YaoState based on semantic markers.
     */
    public static translate(data: unknown, _context?: string): YaoState {
        // 1. Null/Undefined = Void (Young Yin - Potential)
        if (data === null || data === undefined) return YaoState.YoungYin;

        // 2. Direct Enum Matches (Sovereign Dialect)
        if (data === 'Yin' || data === BuildStatus.Failed || data === HealthStatus.Critical) return YaoState.OldYin; // Moving Yin (Failure/Crisis)
        if (data === 'Yang' || data === BuildStatus.Passed || data === HealthStatus.Ready) return YaoState.YoungYang; // Stable Yang (Success)
        if (data === 'YinYang' || data === BuildStatus.Warning || data === HealthStatus.Degraded) return YaoState.OldYang; // Moving Yang (Flux/Warning)
        if (data === 'All' || data === BuildStatus.All || data === HealthStatus.All) return YaoState.All; // Sovereign Unity (All)

        // 3. String-based semantic analysis (Legacy/External)
        if (typeof data === 'string') {
            const lower = data.toLowerCase();
            if (lower.includes('error') || lower.includes('fail') || lower.includes('critical') || lower.includes('fatal')) return YaoState.OldYin; // Hard failure -> Moving Yin
            if (lower.includes('warn') || lower.includes('degraded') || lower.includes('retry')) return YaoState.OldYang; // Warning -> Moving Yang
            if (lower.includes('success') || lower.includes('passed') || lower.includes('ready') || lower.includes('ok')) return YaoState.YoungYang; // stable
            return YaoState.YoungYin; // Neutral / Unknown text is Potential
        }

        // 4. Numeric threshold analysis
        if (typeof data === 'number') {
            if (data < 0) return YaoState.OldYin; // Negative = Yin
            if (data === 0) return YaoState.YoungYin; // Zero = Void
            if (data > 0 && data < 1) return YaoState.OldYang; // Decimal = Flux
            return YaoState.YoungYang; // Positive Integer = Yang
        }

        // 5. Object analysis (Recursive or feature-based)
        if (typeof data === 'object') {
            if ('error' in data || 'err' in data) return YaoState.OldYin;
            if ('ok' in data) {
                return (data as { ok: boolean }).ok ? YaoState.YoungYang : YaoState.OldYin;
            }
            if ('state' in data) {
                // Recursively translate the internal state if possible, or cast it
                return this.translate((data as { state: unknown }).state);
            }
            if ('status' in data) {
                const status = String((data as { status: unknown }).status).toLowerCase();
                if (status === 'ready' || status === 'ok' || status === 'connected') return YaoState.YoungYang;
                if (status === 'error' || status === 'disconnected') return YaoState.OldYin;
            }
        }

        // Default to Young Yin (Passive Potential) - "The Void that awaits Structure"
        return YaoState.YoungYin;
    }

    /**
     * Wraps a Result into a YaoState for quick cognitive pulses.
     */
    public static fromResult<T>(result: Result<T>): YaoState {
        return result.ok ? YaoState.YoungYang : YaoState.OldYin;
    }

    /**
     * Async Transition Guard
     * Safely executes a promise and translates the outcome to a YaoState.
     * Prevents 'unknown' leakage from async boundaries.
     */
    public static async correlateAsync<T>(promise: Promise<T>): Promise<YaoState> {
        try {
            const result = await promise;
            return this.translate(result);
        } catch (error) {
            return YaoState.OldYin; // Exception = Moving Yin (Disruption)
        }
    }
}
