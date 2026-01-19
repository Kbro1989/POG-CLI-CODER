
import 'dotenv/config';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ConfigManager } from '../src/utils/config.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';

async function main() {
    const projectRoot = process.cwd();
    const config = new ConfigManager(projectRoot).getConfig();

    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);

    const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

    console.log('🧪 Testing deepseek-coder:33b replacement with gemini-thinking\n');

    // This prompt triggers architecture/extreme-reasoning capability
    // which should route to gemini-thinking (previously deepseek-coder:33b)
    const architecturePrompt = "Design a microservices architecture for a real-time chat application with 100k concurrent users";

    try {
        console.log('Executing architecture prompt (should use gemini-thinking)...\n');
        const result = await orchestrator.executeIntent(architecturePrompt);

        if (result.ok) {
            console.log('✅ SUCCESS!\n');
            console.log('Response preview:', result.value.substring(0, 200) + '...\n');
        } else {
            console.log('❌ FAILED:', result.error);
        }
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

main();
