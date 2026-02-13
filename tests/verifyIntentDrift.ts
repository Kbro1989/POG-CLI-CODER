import { IntentVerifier } from '../src/core/verification/IntentVerifier.js';
import { ModelExecutor } from '../src/core/ModelExecutor.js';
import { HexagramManager } from '../src/core/HexagramManager.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { VibeConfig, AgentTurnResult, AgentTerminateMode } from '../src/core/models.js';
import { GeminiService } from '../src/core/GeminiService.js';
import { FreeModelRouter } from '../src/core/Router.js';
import { KeyVault } from '../src/utils/KeyVault.js';


async function testDrift() {
    console.log('--- STARTING DRIFT SIMULATION ---');

    const config: VibeConfig = {
        projectId: 'test-pog',
        projectRoot: process.cwd(),
        pogDir: '.pog',
        agentName: 'VerifierTest',
        wsPort: 9999,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldown: 60000,
        logLevel: 'debug',
        enabledServices: ['gemini'],
        embeddingDimensions: 768,
        gutenbergPath: undefined,
        workspaces: [process.cwd()]
    };

    const vectorDB = new VectorDB(config);
    const keyVault = new KeyVault();
    const geminiService = new GeminiService({ apiKey: process.env['GOOGLE_API_KEY'] || '' }, keyVault);
    const router = new FreeModelRouter(config, geminiService);
    const executor = new ModelExecutor(config, geminiService, router);
    const hexagram = new HexagramManager(vectorDB, 'test-pog');

    const verifier = new IntentVerifier(executor, hexagram);

    const originalPrompt = "Create a new file named sovereign.ts that exports a constant named LAW with the value 'NO MOCKS'.";

    // DRIFT SIMULATION: The agent creates a file but uses placeholders/mocks.
    const driftedResult: AgentTurnResult = {
        status: 'stop',
        terminateReason: AgentTerminateMode.GOAL,
        finalResult: "I've created the file, but I used a TODO for the constant because I wasn't sure about the rules.", // DRIFT!
        model: 'gemini-3-flash'
    };

    const context = {
        prompt: originalPrompt,
        sessionId: 'test-session',
        startTime: Date.now()
    };

    console.log('Verifying drifted output...');
    const audit = await verifier.verify(originalPrompt, driftedResult, context as any);

    console.log('--- AUDIT RESULT ---');
    console.log(`Score: ${audit.score}`);
    console.log(`Aligned: ${audit.isAligned}`);
    console.log(`Reasoning: ${audit.reasoning}`);
    console.log(`Correction: ${audit.correction}`);

    if (!audit.isAligned && audit.score < 50) {
        console.log('✅ SUCCESS: Drift correctly detected!');
    } else {
        console.log('❌ FAILURE: Drift missed!');
    }
}

testDrift().catch(console.error);
