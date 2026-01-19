import { ValidationResult } from '../models.js';
import { Validator } from './Validator.js';

/**
 * ValidationSystem - Orchestrates the execution of multiple code validators.
 * rejection logic.
 */
export class ValidationSystem {
    private validators: Validator[] = [];

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
    async validateAll(output: string, context?: any): Promise<ValidationResult> {
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
    async validateComprehensive(output: string, context?: any): Promise<ValidationResult[]> {
        return Promise.all(this.validators.map(v => v.validate(output, context)));
    }
}
