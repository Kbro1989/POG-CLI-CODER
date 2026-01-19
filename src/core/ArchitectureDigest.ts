import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ArchitectureManifest } from './models.js';

/**
 * ArchitectureDigest - Preserves the "Big Picture" integrity.
 * Injects immutable architectural boundaries and domain constraints into prompts.
 */
export class ArchitectureDigest {
    private manifest: ArchitectureManifest;

    constructor(private readonly projectRoot: string) {
        this.manifest = this.loadManifest();
    }

    /**
     * Loads the architecture manifest from the project root.
     * If not found, uses safe defaults focused on sovereignty.
     */
    private loadManifest(): ArchitectureManifest {
        const manifestPath = join(this.projectRoot, 'architecture_manifest.json');
        if (existsSync(manifestPath)) {
            try {
                return JSON.parse(readFileSync(manifestPath, 'utf8'));
            } catch {
                // Fallback to defaults
            }
        }

        return {
            domainModel: {
                'Core': { file: 'src/core/Orchestrator.ts', properties: ['processFunctionCalls', 'executeTurn'] },
                'Learning': { file: 'src/learning/VectorDB.ts', properties: ['addLesson', 'search'] },
                'Limbs': { file: 'src/limbs/webapp/WebAppForgeLimb.ts', properties: ['execute'] },
                'Sandbox': { file: 'src/sandbox/Sandbox.ts', properties: ['execute', 'createSnapshot'] }
            },
            dependencyRules: {
                'core': ['learning', 'utils', 'context'],
                'limbs': ['core', 'utils'],
                'learning': ['utils'],
                'sandbox': ['utils']
            },
            primaryGoal: 'NO MOCKS / TSC TIGHT / PRODUCTION GRADE / LOCAL-FIRST'
        };
    }

    /**
     * Injects the architectural digest into a prompt.
     */
    public inject(prompt: string): string {
        const digest = `
=== ARCHITECTURAL DIGEST (IMMUTABLE) ===
PRIMARY GOAL: ${this.manifest.primaryGoal}

DOMAIN MODEL:
${Object.entries(this.manifest.domainModel).map(([k, v]) => `- ${k}: ${v?.file || 'unknown'} (Core properties: ${(v?.properties || []).join(', ')})`).join('\n')}

DEPENDENCY RULES:
${Object.entries(this.manifest.dependencyRules).map(([k, v]) => `- ${k} can import from: ${v.join(', ')}`).join('\n')}

SOVEREIGN LAWS:
1. NO MOCKS: All code must be fully implemented against real APIs.
2. NO PLACEHOLDERS: TODO/FIXME/Stub patterns are forbidden.
3. TSC TIGHT: All code must pass strict TypeScript checks.
=== DO NOT DEVIATE ===
`;

        return `${digest}\n\n${prompt}`;
    }

    public getManifest(): ArchitectureManifest {
        return this.manifest;
    }
}
