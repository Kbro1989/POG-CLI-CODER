import 'dotenv/config';
import { ConfigManager } from '../src/utils/config.js';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';



async function runDemo() {
    const projectRoot = process.cwd();
    const configManager = new ConfigManager(projectRoot);
    const config = configManager.getConfig();

    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);

    const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

    console.log('🚀 Starting POG-CODER-VIBE E2E Demonstration...');

    // Initialize
    const initResult = await orchestrator.initialize();
    if (!initResult.ok) {
        console.error('❌ Initialization failed:', initResult.error);
        process.exit(1);
    }

    if (!process.env['GOOGLE_API_KEY']) {
        console.warn('⚠️ GOOGLE_API_KEY not found in environment. Cloud features will be disabled.');
    } else {
        console.log('☁️ Gemini Cloud Tier: ACTIVE');
    }

    console.log('✅ System Initialized.');
    console.log('🎨 Mode: Sovereign Intelligence (Production)');
    console.log('🧠 Building Omniscience Map...');

    const prompt = 'create sovereign-health-monitor app - interactive status page showing Cloud/Local model tiers. Use glassmorphism and modern technical aesthetics. Use all available models and tools.';
    console.log(`🔨 Executing Intent: "${prompt}"`);

    try {
        const result = await orchestrator.executeIntent(prompt);
        if (result.ok) {
            console.log('\n✅ Response received:');
            console.log(result.value);
            console.log('\n✨ Project generated successfully in .pog-coder-vibe/projects/');
        } else {
            console.error('❌ Intent execution failed:', result.error);
        }
    } catch (error) {
        console.error('💥 Unexpected error:', error);
    } finally {
        await orchestrator.cleanup();
        process.exit(0);
    }
}

runDemo();

