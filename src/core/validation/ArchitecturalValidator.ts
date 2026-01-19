import { ValidationResult, ArchitectureManifest } from '../models.js';
import { Validator } from './Validator.js';

/**
 * ArchitecturalValidator - Enforces core architectural constraints (Big Picture).
 * Verifies that code doesn't introduce illegal dependencies or invalid types.
 */
export class ArchitecturalValidator implements Validator {
    readonly name = 'ArchitecturalValidator';

    constructor(private readonly manifest: ArchitectureManifest) { }

    async validate(output: string, context?: { fileName?: string }): Promise<ValidationResult> {
        // 1. Check for illegal dependencies (e.g. core depending on limbs)
        const imports = this.extractImports(output);
        for (const imp of imports) {
            if (this.isIllegalDependency(imp, context?.fileName)) {
                return {
                    ok: false,
                    error: {
                        reason: `Architectural violation: Illegal dependency "${imp}" detected in ${context?.fileName || 'unknown file'}.`,
                        suggestion: `Refer to the Architecture Manifest for allowed dependencies in this layer.`
                    }
                };
            }
        }

        // 2. Verify against Big Picture Goal (Semantic alignment check)
        // This part normally requires a model, but we can do string matches for key constraints
        if (this.violatesPrimaryGoal(output)) {
            return {
                ok: false,
                error: {
                    reason: `Code deviates from the primary architectural goal: "${this.manifest.primaryGoal}"`,
                    suggestion: 'Ensure the implementation aligns with the sovereign "NO MOCKS" and "TSC TIGHT" standards.'
                }
            };
        }

        return { ok: true, value: true };
    }

    private extractImports(output: string): string[] {
        const importPattern = /import\s+.*from\s+['"](.*)['"]/g;
        const imports: string[] = [];
        let match;
        while ((match = importPattern.exec(output)) !== null) {
            if (match[1]) {
                imports.push(match[1]);
            }
        }
        return imports;
    }

    private isIllegalDependency(imp: string, currentFile?: string): boolean {
        if (!currentFile) return false;

        // Extract layer from current file (e.g. src/core/Orchestrator.ts -> core)
        const currentLayerMatch = currentFile.match(/src\/([^/]+)/);
        if (!currentLayerMatch) return false;
        const layerName = currentLayerMatch[1];
        if (!layerName) return false;
        const currentLayer = layerName.toLowerCase();

        // Check if current layer has restrictions in manifest
        const allowedDeps = this.manifest.dependencyRules[currentLayer] || [];

        // Check if import starts with a restricted layer that is NOT in the allowed list
        for (const layer of Object.keys(this.manifest.dependencyRules)) {
            if (imp.includes(`/src/${layer}/`) || imp.includes(`../${layer}/`)) {
                if (!allowedDeps.includes(layer) && layer !== currentLayer) {
                    return true;
                }
            }
        }

        return false;
    }

    private violatesPrimaryGoal(output: string): boolean {
        // If primary goal includes "NO MOCKS", check for mock-related patterns
        if (this.manifest.primaryGoal.includes('NO MOCKS')) {
            const mockPatterns = [
                /jest\.fn\(\)/,
                /vi\.fn\(\)/,
                /sinon\.stub\(\)/,
                /mock\(/,
                /Mock\w+/
            ];
            return mockPatterns.some(pattern => pattern.test(output));
        }
        return false;
    }
}
