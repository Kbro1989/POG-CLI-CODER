
import { KeyVault } from '../src/utils/KeyVault.js';
import { GeminiService } from '../src/core/GeminiService.js';

async function testModel(service: GeminiService, modelId: string): Promise<boolean> {
    console.log(`🤖 Testing Model: ${modelId}`);
    const start = Date.now();
    const result = await service.generateContent('Heard any good rumors lately? (Test message)', modelId);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    if (result.ok) {
        console.log(`✅ SUCCESS (${duration}s)`);
        console.log(`💬 Response: ${result.value.response.substring(0, 100)}...`);
        return true;
    } else {
        console.error(`❌ FAILURE (${duration}s)`);
        console.error(`   Error: ${result.error.message}`);
        return false;
    }
}

async function main() {
    console.log('🧪 Verifying Gemini Model Quotas...\n');

    try {
        const vault = new KeyVault();
        const apiKey = vault.getCurrentKey();

        if (!apiKey) {
            console.error('❌ ERROR: No API key found in KeyVault.');
            const keys = vault.listKeys();
            if (keys.length === 0) {
                console.log('   Please add a key using: pog key add <name> <key>');
            } else {
                console.log('   Available keys (none active):');
                keys.forEach(k => console.log(`   - ${k.name} (${k.masked})`));
            }
            return;
        }

        console.log(`📡 Using active key from vault...`);

        const service = new GeminiService({ apiKey });

        const modelsToTest = [
            'gemini-3-pro-preview',
            'gemini-2.0-flash-thinking-preview',
            'gemini-2.0-flash',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ];

        for (const model of modelsToTest) {
            await testModel(service, model);
            console.log('-'.repeat(40));
        }

    } catch (err: any) {
        console.error(`💥 CRITICAL ERROR: ${err.message}`);
    }
}

main();

