import { ValidationResult } from '../models.js';
import { Validator } from './Validator.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';

const execAsync = promisify(exec);
const logger = pino({
    name: 'ValidationSystem',
    base: { hostname: 'POG-VIBE' }
});

/**
 * ValidationSystem - Orchestrates the execution of multiple code validators.
 * rejection logic.
 */
export class ValidationSystem {
    private readonly validators: Validator[] = [];

    constructor(validators: Validator[] = []) {
        this.validators = validators;
    }

    addValidator(validator: Validator): void {
        this.validators.push(validator);
    }

    /**
     * Run all validators against the output.
     * Returns the first failure encountered or ok: true.
     */
    async validateAll(output: string, context?: unknown): Promise<ValidationResult> {
        for (const validator of this.validators) {
            const result = await validator.validate(output, context);
            if (!result.ok) {
                return result;
            }
        }
        return { ok: true, value: true };
    }

    /**
     * Run all validators and return all failures (for comprehensive feedback).
     */
    async validateComprehensive(output: string, context?: unknown): Promise<ValidationResult[]> {
        return Promise.all(this.validators.map(v => v.validate(output, context)));
    }

    /**
     * Run Process Validation — Ground-Truth TypeCheck
     * 
     * Spawns a real `npm run typecheck` as the ultimate validation step.
     * Returns a standard ValidationResult that integrates with the
     * existing validator chain.
     * 
     * Mapped to Hexagram Line 4 (External Environment / Dependencies):
     *  - Pass:  ok: true  (Environment confirms structural health)
     *  - Fail:  ok: false (Environment rejects — compilation errors)
     */
    async runProcessValidation(projectRoot: string): Promise<ValidationResult> {
        logger.info({ projectRoot }, 'Running process-level validation (npm run typecheck)');

        try {
            await execAsync('npm run typecheck', {
                cwd: projectRoot,
                timeout: 30000
            });

            logger.info('Process validation passed');
            return { ok: true, value: true };
        } catch (error: unknown) {
            const err = error as { stderr?: string; stdout?: string; message?: string };
            const errorOutput = err.stderr || err.stdout || err.message || 'TypeScript compilation failed';

            // Extract first few error lines for actionable feedback
            const errorLines = errorOutput.split('\n')
                .filter((l: string) => l.includes('error TS'))
                .slice(0, 5)
                .join('; ');

            logger.warn({ errorSample: errorLines.substring(0, 200) }, 'Process validation failed');

            return {
                ok: false,
                error: {
                    reason: 'TypeScript compilation failed',
                    suggestion: errorLines || errorOutput.substring(0, 500)
                }
            };
        }
    }
}
