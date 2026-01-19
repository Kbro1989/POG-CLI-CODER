import { ValidationResult } from '../models.js';
import { Validator } from './Validator.js';

/**
 * NoMockValidator - Enforces the "NO MOCKS / NO PLACEHOLDERS" sovereign law.
 * Detects TODOs, stubbed functions, and mock references using regex patterns.
 */
export class NoMockValidator implements Validator {
    readonly name = 'NoMockValidator';

    private readonly forbiddenPatterns: ReadonlyArray<{ pattern: RegExp; reason: string; suggestion: string }> = [
        {
            pattern: /\/\/.*(?:TODO|FIXME|HACK|XXX)/i,
            reason: 'Contains placeholder comments (TODO/FIXME)',
            suggestion: 'Fully implement the logic or remove the comment if implementation is complete.'
        },
        {
            pattern: /function\s+\w+\s*\([^)]*\)\s*\{\s*(?:\/\/.*)?\s*return\s+(?:null|undefined|{})\s*;?\s*\}/,
            reason: 'Detected a stubbed function (empty/null return)',
            suggestion: 'Implement the actual function logic.'
        },
        {
            pattern: /function\s+\w+\s*\([^)]*\)\s*\{\s*(?:\/\/.*)?\s*throw\s+new\s+Error\(['"](?:not implemented|TODO)['"]/i,
            reason: 'Detected a "not implemented" error placeholder',
            suggestion: 'Implement the logic instead of throwing a placeholder error.'
        },
        {
            pattern: /console\.log\(['"](?:mock|stub|placeholder|temp)['"]/i,
            reason: 'Detected a mock/temporary log statement',
            suggestion: 'Remove temporary logs or implement real logging.'
        },
        {
            pattern: /mock(?:Data|User|Service|Response|Api)/i,
            reason: 'Detected variables named "mock*"',
            suggestion: 'Use real data structures and service instances.'
        },
        {
            pattern: /\.\.\.|\/\/\s*etc/i,
            reason: 'Detected an ellipsis or "etc" comment indicating incomplete logic',
            suggestion: 'Complete the full list or logic sequence.'
        }
    ];

    async validate(output: string): Promise<ValidationResult> {
        for (const { pattern, reason, suggestion } of this.forbiddenPatterns) {
            const match = pattern.exec(output);
            if (match) {
                return {
                    ok: false,
                    error: {
                        reason,
                        pattern: match[0],
                        suggestion
                    }
                };
            }
        }

        // AST-like check for empty function bodies if regex is too lenient
        if (this.hasEmptyFunctions(output)) {
            return {
                ok: false,
                error: {
                    reason: 'Empty function body detected',
                    suggestion: 'All functions must have a valid implementation according to Sovereign Laws.'
                }
            };
        }

        return { ok: true, value: true };
    }

    private hasEmptyFunctions(output: string): boolean {
        // Simple check for empty braces in function definitions
        // This can be improved with a real parser (e.g. acorn or ts-morph)
        const emptyBodyPattern = /function\s+\w+\s*\([^)]*\)\s*\{\s*(?:\/\/.*)?\s*\}/g;
        return emptyBodyPattern.test(output);
    }
}
