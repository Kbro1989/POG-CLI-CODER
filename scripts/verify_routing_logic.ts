
import { FreeModelRouter } from '../src/core/Router.js';
import { VibeConfig, TaskType } from '../src/core/models.js';
import path from 'path';

// Mock Config
const mockConfig: VibeConfig = {
    projectId: 'test-project',
    projectRoot: process.cwd(),
    pogDir: path.join(process.cwd(), '.pog_coder_vibe'),
    enabledServices: [],
    agentName: 'POG-VIBE-TEST',
    wsPort: 3000,
    maxSnapshotAge: 86400000,
    circuitBreakerThreshold: 3,
    circuitBreakerCooldown: 10000,
    embeddingDimensions: 384,
    logLevel: 'info',
    errorTrackerModelPath: undefined
};

// Mock Environment
process.env.GOOGLE_API_KEY = 'mock-key';

async function verifyRouting() {
    console.log('🧪 Verifying Ternary Routing Logic...\n');

    // Instantiate Router
    const router = new FreeModelRouter(mockConfig, undefined);

    const testCases = [
        {
            name: 'Simple Syntax Fix',
            prompt: 'Fix the syntax error in this function: const x =; ',
            expectedType: 'Local'
        },
        {
            name: 'Complex Architecture',
            prompt: 'Design a microservices architecture for a banking system with event sourcing and CQRS.',
            expectedType: 'Cloud'
        },
        {
            name: 'Code Generation',
            prompt: 'Create a React component for a login form.',
            expectedType: 'Cloud'
        },
        {
            name: 'Short Diagnostic',
            prompt: 'status',
            expectedType: 'Cloud'
        }
    ];

    for (const test of testCases) {
        console.log(`\n📋 Case: ${test.name}`);
        console.log(`   Prompt: "${test.prompt}"`);

        const result = router.route(test.prompt);

        if (result.ok) {
            // FIX: Router returns a string (model name), not an object
            const modelName: string = result.value;
            console.log(`   Selected Model: ${modelName}`);

            const isCloud = modelName.includes('gemini');
            const type = isCloud ? 'Cloud' : 'Local';

            console.log(`   Type: ${type}`);

            // Basic verification
            const expectedCloud = test.expectedType === 'Cloud';

            if (isCloud === expectedCloud) {
                console.log('   ✅ Routing Correct');
            } else {
                console.log(`   ⚠️ Routing Mismatch (Expected ${test.expectedType}, got ${type})`);
            }
        } else {
            console.log(`   ❌ Routing Failed: ${result.error?.message}`);
        }
    }
}

verifyRouting().catch(console.error);
