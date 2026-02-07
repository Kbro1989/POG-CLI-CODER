/**
 * @license
 * POG-CODER-VIBE
 * Type-safe exhaustiveness checking utilities
 * Inspired by Google's gemini-cli patterns
 */

/**
 * Compile-time exhaustiveness check.
 * This function is never executed at runtime, but forces TypeScript
 * to verify that all possible values have been handled.
 * 
 * @example
 * ```ts
 * type Status = 'pending' | 'success' | 'error';
 * function handleStatus(status: Status) {
 *   switch (status) {
 *     case 'pending': return 'Loading...';
 *     case 'success': return 'Done!';
 *     case 'error': return 'Failed!';
 *     default: assumeExhaustive(status); // TypeScript error if case missing
 *   }
 * }
 * ```
 */
export function assumeExhaustive(_value: never): void {
    // Intentionally empty - this is a compile-time check only
}

/**
 * Runtime exhaustiveness check that throws an error for unexpected values.
 * Use this in switch statement default cases to ensure all enum/union values are handled.
 * 
 * @param value - The value that should never be reached (type: never)
 * @param msg - Optional custom error message
 * @throws Error with the unexpected value
 * 
 * @example
 * ```ts
 * type ModelTier = 'local' | 'edge' | 'cloud';
 * 
 * function routeToModel(tier: ModelTier): string {
 *   switch (tier) {
 *     case 'local': return 'qwen2.5:3b';
 *     case 'edge': return 'gemini-2.0-flash-lite';
 *     case 'cloud': return 'gemini-2.0-flash-exp';
 *     default: checkExhaustive(tier); // Throws if new tier added without handling
 *   }
 * }
 * ```
 */
export function checkExhaustive(
    value: never,
    msg?: string,
): never {
    assumeExhaustive(value);
    const errorMsg = msg ?? `Unexpected value encountered: ${JSON.stringify(value)}`;
    throw new Error(errorMsg);
}

/**
 * Type guard to check if a value is exhaustively one of the expected types.
 * Useful for runtime validation in addition to compile-time checks.
 * 
 * @example
 * ```ts
 * type Result = { ok: true, value: string } | { ok: false, error: Error };
 * 
 * function handleResult(result: Result) {
 *   if (result.ok) {
 *     return result.value;
 *   } else if (!result.ok) {
 *     throw result.error;
 *   }
 *   // TypeScript knows this is unreachable
 *   assertExhaustive(result);
 * }
 * ```
 */
export function assertExhaustive(value: never, context?: string): never {
    const ctx = context ? ` (context: ${context})` : '';
    throw new Error(`Assertion failed: Unexpected value ${JSON.stringify(value)}${ctx}`);
}
