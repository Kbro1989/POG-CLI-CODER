
import 'dotenv/config';

const MODELS_TO_TEST = [
    'qwen2.5-coder:14b-instruct-q5_K_M',
    'yi-coder:9b-chat-q5_K_M',
    'qwen2.5-coder:7b-instruct-q4_K_M',
    'deepseek-coder:33b-instruct-q4_K_M'
];

const TEST_PROMPT = 'Write hello world in Python';

async function testModel(modelName: string): Promise<boolean> {
    console.log(`\n🧪 Testing ${modelName}...`);
    const start = Date.now();

    try {
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelName,
                prompt: TEST_PROMPT,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: any = await response.json();
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        console.log(`✅ SUCCESS (${duration}s)`);
        console.log(`   Response: ${data.response.substring(0, 80)}...`);
        return true;
    } catch (e: any) {
        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`❌ ERROR (${duration}s) - ${e.message}`);
        return false;
    }
}

async function main() {
    console.log('🔍 Testing Local Ollama Models\n');
    console.log('Running full tests (no timeout) to identify actual failures\n');
    console.log('='.repeat(60));

    const results: { model: string; passed: boolean }[] = [];

    for (const model of MODELS_TO_TEST) {
        const passed = await testModel(model);
        results.push({ model, passed });
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESULTS:\n');

    const working = results.filter(r => r.passed);
    const failing = results.filter(r => !r.passed);

    if (working.length > 0) {
        console.log('✅ Working Models (Keep Local):');
        working.forEach(r => console.log(`   - ${r.model}`));
    }

    if (failing.length > 0) {
        console.log('\n❌ Failing Models (Replace with Google AI):');
        failing.forEach(r => console.log(`   - ${r.model}`));
    }

    console.log(`\n📈 Summary: ${working.length}/${results.length} models working locally`);
}

main();
