
import { HexagramManager } from '../src/core/HexagramManager.js';
import { ModelExecutor } from '../src/core/ModelExecutor.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { GeminiService } from '../src/core/GeminiService.js';
import { FreeModelRouter } from '../src/core/Router.js';
import { VibeConfig, TriAxis } from '../src/core/models.js';
import { KeyVault } from '../src/utils/KeyVault.js';

async function verifyOracle() {
    console.log('--- STARTING ORACLE VERIFICATION ---');

    const config: VibeConfig = {
        projectId: 'oracle-test',
        projectRoot: process.cwd(),
        pogDir: '.pog',
        agentName: 'OracleVerifier',
        wsPort: 9991,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldown: 60000,
        logLevel: 'debug',
        enabledServices: ['gemini'],
        embeddingDimensions: 768,
        rootStack: [], // Added to satisfy VibeConfig
        environment: 'local'
    };

    const vectorDB = new VectorDB(config);
    const keyVault = new KeyVault();
    const geminiService = new GeminiService({ apiKey: process.env['GOOGLE_API_KEY'] || '' }, keyVault);
    const router = new FreeModelRouter(config, geminiService);
    const hexagram = new HexagramManager(vectorDB, 'oracle-test');
    const executor = new ModelExecutor(config, geminiService, hexagram, router);

    const intent = "Integrate a new Quantum Limb into the system.";
    const axes: [TriAxis, TriAxis, TriAxis] = [
        { axis: 'X', positive: 'Feasible', negative: 'Impossible', neutral: 'Unknown' },
        { axis: 'Y', positive: 'Beneficial', negative: 'Harmful', neutral: 'Neutral' },
        { axis: 'Z', positive: 'Aligned', negative: 'Divergent', neutral: 'Tangential' }
    ];

    console.log(`Intent: "${intent}"`);
    console.log('Consulting Oracle...');

    const result = await hexagram.consultOracle({ intent, axes }, executor);

    if (result.ok) {
        console.log('✅ Oracle Consultation Successful!');
        console.log('Hexagram Definition:', result.value.name);
        console.log('Strategy:', result.value.strategy);

        // Check the 6 lines
        const context = await hexagram.getHexagramContext();
        if (context.ok) {
            console.log('\n--- GENERATED LINES ---');
            context.value.forEach(card => {
                console.log(`Line ${card.lineIndex}: ${card.title} [State: ${card.state}]`);
            });
            if (context.value.length === 6) {
                console.log('✅ All 6 lines generated.');
            } else {
                console.log('❌ Line count mismatch:', context.value.length);
            }
        }
    } else {
        console.error('❌ Oracle Consultation Failed:', result.error);
    }
}

verifyOracle().catch(console.error);
