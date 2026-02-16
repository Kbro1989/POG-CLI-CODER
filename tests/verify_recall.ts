
import { VectorDB } from '../src/learning/VectorDB.js';
import { VibeConfig } from '../src/core/models.js';

async function verifyRecall() {
    console.log('--- STARTING RECALL VERIFICATION ---');

    // 1. Load Real Config (Federated)
    // const configManager = new ConfigManager(process.cwd());
    // const config = configManager.getConfig();

    const config: VibeConfig = {
        projectId: 'recall-test',
        projectRoot: process.cwd(),
        pogDir: '.pog',
        agentName: 'RecallVerifier',
        wsPort: 9992,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldown: 60000,
        logLevel: 'debug',
        enabledServices: ['vectorStore'],
        embeddingDimensions: 768,
        rootStack: [], // Added to satisfy VibeConfig
        environment: 'local'
    };

    console.log('Identity:', 'Test Identity');
    console.log('Root Stack:', config.rootStack);

    // 2. Initialize VectorDB
    const vectorDB = new VectorDB(config);

    // 3. Plant a "Sovereign Memory" (if D: exists, it goes there?)
    // Actually, VectorDB usually writes to .pog/.vectors or similar unless configured otherwise.
    // We want to test RECALL.

    const testId = `recall_test_${Date.now()}`;
    const testContent = "The biological pulse of the machine connects the silicon substrate to the user's intent.";

    console.log(`\nPlanting memory: "${testContent}"`);

    await vectorDB.addLesson({
        id: testId,
        projectId: config.projectId,
        sessionId: 'audit_session',
        text: testContent,
        embedding: new Float32Array(768).fill(0.1), // Mock embedding
        createdAt: Date.now(),
        metadata: { type: 'audit_trace', biological: true },
        errorType: 'none'
    });

    console.log('Memory planted. Waiting for persistence...');
    await new Promise(r => setTimeout(r, 1000));

    // 4. Recall
    console.log('\nAttempting Recall (Signal Search)...');

    // We use a mock embedding that matches the planted one
    const queryEmbedding = new Float32Array(768).fill(0.1);
    const results = await vectorDB.searchSimilar(queryEmbedding, 5, config.projectId);

    if (results.ok) {
        const found = results.value.find(l => l.id === testId);
        if (found) {
            console.log('✅ RECALL SUCCESSFUL');
            console.log('Retrieved:', found.text);
            console.log('Metadata:', found.metadata);
        } else {
            console.error('❌ Memory planted but NOT found in recall results.');
            console.log('Results found:', results.value.map(l => l.id));
        }
    } else {
        console.error('❌ Search failed:', results.error);
    }
}

verifyRecall().catch(console.error);
