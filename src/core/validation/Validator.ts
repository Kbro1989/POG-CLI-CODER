import { ValidationResult } from '../models.js';

/**
 * Base interface for all code validators in the Sovereign Intelligence stack.
 */
export interface Validator {
    readonly name: string;
    validate(output: string, context?: any): Promise<ValidationResult>;
}
