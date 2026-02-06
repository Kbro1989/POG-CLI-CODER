
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ConfigManager } from '../src/utils/config.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { TaskType } from '../src/core/models.js';

async function main() {
    console.log('🧪 Verifying Conversational Mode...');

    const configManager = new ConfigManager(process.cwd());
    const config = configManager.getConfig();
    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);

    const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

    // Mock capabilities for testing without API keys if needed, 
    // but Orchestrator typically requires them. 
    // We assume the environment is set up as this is running in the user's context.

    const conversationalPrompt = "Hello, who are you?";
    console.log(`\nTesting Prompt: "${conversationalPrompt}"`);

    // We can't easily mock the private method classifyTaskType directly without casting to any,
    // so we'll test the public executeIntent and check logs or response time/structure if possible.
    // Ideally, we'd mock the modelExecutor to verify it was called with the fast path.
    // But for an integration test, we'll try to run it.

    // Hack to access private method for verification
    const taskType = (orchestrator as any).classifyTaskType(conversationalPrompt);
    console.log(`Classified TaskType: ${taskType}`);

    if (taskType === TaskType.Conversational) {
        console.log('✅ TaskType correctly classified as Conversational');
    } else {
        console.error(`❌ Expected Conversational, got ${taskType}`);
        process.exit(1);
    }

    console.log('\n✅ Verification Script Complete');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
