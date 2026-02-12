
import 'dotenv/config';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ConfigManager } from '../src/utils/config.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import pino from 'pino';

// Silence main logger for this script
const logger = pino({ level: 'silent' });

async function main() {
    const projectRoot = process.cwd();
    const config = new ConfigManager(projectRoot).getConfig();

    // Mocks
    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);

    const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

    console.log('🚀 Starting Connection Test...');

    // Chrome/Gemini test prompt
    const geminiPrompt = "Explain the quantum superposition principle in one sentence.";

    try {
        console.log('\n--- Testing Hybrid Routing (Expected: Gemini Fallback or Auto-Selection) ---');
        // We can't easily force Gemini without mocking the router's decision, 
        // but we can check if the Orchestrator has the service initialized.

        // @ts-ignore - Accessing private property for verification
        if (orchestrator.geminiService) {
            console.log('✅ Gemini Service is initialized with API Key.');
        } else {
            // Attempt a call that might trigger fallback or use it if available
            // Or simply force initialization logic check
            const apiKey = process.env['GOOGLE_API_KEY'];
            if (apiKey) {
                console.log('✅ GOOGLE_API_KEY found in env.');
            } else {
                console.error('❌ GOOGLE_API_KEY NOT found in env.');
            }
        }

        const result = await orchestrator.executeIntent(geminiPrompt);

        if (result.ok) {
            console.log('✅ Execution Success!');
            console.log('Response:', result.value);
        } else {
            console.error('❌ Execution Failed:', result.error);
        }

    } catch (error) {
        console.error('💥 Script Error:', error);
    }
}

main();
