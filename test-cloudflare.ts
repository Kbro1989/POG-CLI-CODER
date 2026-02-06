import { ModelExecutor } from './src/core/ModelExecutor.js';
import { ConfigManager } from './src/utils/config.js';
import { GeminiService } from './src/core/GeminiService.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testCloudflareFallback() {
    console.log('🚀 Starting Cloudflare AI Gateway Fallback Test...');

    const configManager = new ConfigManager(process.cwd());
    const config = configManager.getConfig();

    // Initialize with a fake API key for Gemini to force it to fail, 
    // or just let it fail if the key is invalid. 
    // To TRULY test CF, we should ensure Ollama AND Gemini fail.
    const geminiService = new GeminiService('INVALID_KEY');
    const executor = new ModelExecutor(config, geminiService);

    console.log('📡 Sending request to non-existent local model to trigger fallbacks...');

    try {
        // We use a model name that definitely doesn't exist in Ollama
        const result = await executor.callModel('pog-non-existent-model', 'Hello Cloudflare, are you there?');

        console.log('🏁 Execution Chain Finished.');
        if (result.ok) {
            console.log('✅ TEST SUCCESSFUL!');
            console.log('Model Used:', result.value.model);
            console.log('Response:', result.value.response);
            console.log('Latency:', result.value.latency, 'ms');
        } else {
            console.error('❌ TEST FAILED:', result.error.message);
            console.error('Stack:', result.error.stack);
        }
    } catch (err) {
        console.error('💥 CRITICAL ERROR:', err);
    }
}

testCloudflareFallback();
