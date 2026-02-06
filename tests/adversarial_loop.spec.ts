import { AdversarialOrchestrator } from '../src/core/AdversarialOrchestrator';
import { ValidationSystem } from '../src/core/validation/ValidationSystem';
import { ArchitectureDigest } from '../src/core/ArchitectureDigest';
import { ModelExecutor } from '../src/core/ModelExecutor';
import { ValidationResult, Result, ModelResponse, VibeConfig } from '../src/core/models';

// Mock Config - strictly typed to VibeConfig interface
const mockConfig: VibeConfig = {
    pogDir: process.cwd(),
    projectRoot: process.cwd(),
    agentName: 'TEST-AGENT',
    wsPort: 3000,
    maxSnapshotAge: 1000,
    circuitBreakerThreshold: 3,
    circuitBreakerCooldown: 1000,
    embeddingDimensions: 768,
    logLevel: 'error',
    projectId: 'test',
    enabledServices: []
};

// Mock Executor using simple cast to avoid private property issues
class MockExecutor {
    async callModel(model: string, prompt: string): Promise<Result<ModelResponse>> {
        const baseResponse = { model, latency: 10 };

        if (prompt.includes('generate')) {
            return { ok: true, value: { ...baseResponse, response: 'function test() { return "flawed"; } // TODO: Fix this' } };
        }
        if (prompt.includes('FIND ALL FLAWS')) {
            return { ok: true, value: { ...baseResponse, response: JSON.stringify({ score: 50, flaws: ['Contains TODO'] }) } };
        }
        if (prompt.includes('YOUR PREVIOUS OUTPUT WAS REJECTED')) {
            return { ok: true, value: { ...baseResponse, response: 'function test() { return "fixed"; }' } };
        }
        return { ok: true, value: { ...baseResponse, response: 'OK' } };
    }
}

describe('Adversarial Loop Integration', () => {
    let orchestrator: AdversarialOrchestrator;
    let executor: ModelExecutor;

    beforeAll(() => {
        executor = new MockExecutor() as unknown as ModelExecutor;
        class MockValidator {
            async validateAll(code: string): Promise<ValidationResult> {
                if (code.includes('TODO')) {
                    return { ok: false, error: { reason: 'Contains TODO' } };
                }
                return { ok: true, value: true };
            }
        }

        const validator = new MockValidator() as unknown as ValidationSystem;
        const digest = {} as unknown as ArchitectureDigest;

        orchestrator = new AdversarialOrchestrator(
            mockConfig,
            executor,
            validator,
            digest
        );
    });

    test('Orchestrator should instantiate correctly', () => {
        expect(orchestrator).toBeDefined();
    });

    test('Should reject flawed code and retry (Simulation)', async () => {
        const result = await orchestrator.generateValidatedCode('generate code', 'test-model');
        expect(result).toBeDefined();
        // Check that result is OK, meaning it retried and got the fixed version
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.response).toContain('fixed');
        }
    });
});
