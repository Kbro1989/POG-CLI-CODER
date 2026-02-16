import 'dotenv/config';
import { CodebaseIndexer } from '../src/learning/CodebaseIndexer.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { ContextBuilder } from '../src/context/ContextBuilder.js';
import { ModelExecutor } from '../src/core/ModelExecutor.js';
import { GeminiService } from '../src/core/GeminiService.js';
import { HexagramManager } from '../src/core/HexagramManager.js';
import { VibeConfig } from '../src/core/models.js';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

async function verifyAIContext() {
    console.log('🧠 Verifying AI Context & Semantic Learning (Brain Process)...\n');

    const config: VibeConfig = {
        projectId: 'context-verify',
        rootStack: [], projectRoot: process.cwd(),
        pogDir: join(process.cwd(), '.pog_test_learning'),
        agentName: 'BRAIN_TESTER',
        wsPort: 3001,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 3,
        circuitBreakerCooldown: 60000,
        embeddingDimensions: 768,
        logLevel: 'info',
        enabledServices: [],
        workspaces: [process.cwd()],
        environment: 'local'
    };

    const vectorDB = new VectorDB(config);
    const gemini = new GeminiService({ apiKey: process.env['GOOGLE_API_KEY'] || 'mock-key' });
    const hexagram = new HexagramManager(vectorDB, config.projectId);
    const modelExecutor = new ModelExecutor(config, gemini, hexagram);

    const projectRoot = config.projectRoot;
    const testFile = join(projectRoot, 'verify_learning_test.txt');

    try {
        await vectorDB.initialize();
        await hexagram.initialize();

        // 1. Create a unique fact
        const secretFact = "The golden key to the sovereign gate is hidden in the silence of the core.";
        writeFileSync(testFile, secretFact);
        console.log('1. Created unique test fact in verify_learning_test.txt');

        // 2. Initialize Indexer
        const indexer = new CodebaseIndexer(vectorDB, gemini, projectRoot);
        const contextBuilder = new ContextBuilder(vectorDB, projectRoot, config.projectId, modelExecutor);

        // 3. Index the specific file
        console.log('2. Indexing file...');
        await indexer.indexFile(testFile);

        // 4. Query Global Context
        console.log('3. Querying Global Context...');
        const globalContext = await contextBuilder.getGlobalContext("What is the golden key to the sovereign gate?");

        console.log('   Results found in context:', globalContext.length);

        const found = globalContext.some(path => path.includes('verify_learning_test.txt'));

        if (found) {
            console.log('\n✅ SUCCESS: AI Context file was retrieved via semantic search!');
        } else {
            console.error('\n❌ FAILURE: Test file was NOT found in global context.');
            const dbCount = await vectorDB.getLessonCount();
            console.log(`   Total lessons in DB: ${dbCount}`);
        }

    } catch (err: any) {
        console.error('❌ Error during verification:', err);
    } finally {
        // Cleanup
        if (existsSync(testFile)) unlinkSync(testFile);
        if (existsSync(config.pogDir)) {
            // we leave the dir but the next run will overwrite or use it
        }
        await vectorDB.close();
    }
}

verifyAIContext().catch(console.error);

