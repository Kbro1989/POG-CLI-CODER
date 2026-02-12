
import 'dotenv/config';
import { GeminiService } from '../src/core/GeminiService.js';

const MODELS_TO_TEST = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
];

async function main() {
    const apiKey = process.env['GOOGLE_API_KEY'];

    if (!apiKey) {
        console.error('❌ GOOGLE_API_KEY not found.');
        process.exit(1);
    }

    console.log(`🔑 Key detected (${apiKey.substring(0, 8)}...)`);
    console.log('🚀 Checking Model Capabilities...\n');

    let workingModels = [];

    for (const model of MODELS_TO_TEST) {
        process.stdout.write(`Testing ${model.padEnd(25)} ... `);
        try {
            const service = new GeminiService(apiKey, model);
            // Use a very simple prompt
            const result = await service.generateContent('Hi');

            if (result.ok) {
                console.log('✅ OK');
                workingModels.push(model);
            } else {
                // @ts-ignore
                const msg = result.error?.message || 'Unknown Error';
                if (msg.includes('404')) console.log('❌ Not Found (404)');
                else if (msg.includes('403')) console.log('❌ Permission Denied (403)');
                else console.log(`❌ Error: ${msg.substring(0, 50)}...`);
            }
        } catch (err) {
            console.log('❌ Exception');
        }
    }

    console.log('\n📊 Capability Report:');
    if (workingModels.length > 0) {
        console.log(`✅ The API Key is valid and can access: ${workingModels.join(', ')}`);
    } else {
        console.error('❌ The API Key could not access any standard models. Check quotas or key restrictions.');
    }
}

main();
