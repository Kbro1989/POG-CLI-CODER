
import 'dotenv/config';
import { GeminiService } from '../src/core/GeminiService.js';
import pino from 'pino';

// Simple logger
const logger = pino({ level: 'info', transport: { target: 'pino-pretty' } });

const OLLAMA_MODEL = 'qwen2.5-coder:14b-instruct-q5_K_M';
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const PROMPT = 'Write a one-sentence python function to calculate the Fibonacci sequence recursively.';

async function testOllama() {
    console.log(`\n🤖 Testing LOCAL Ollama [${OLLAMA_MODEL}]...`);
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: PROMPT,
                stream: false
            }),
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!response.ok) throw new Error(`Ollama Error: ${response.statusText}`);
        const data: any = await response.json();
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        console.log(`✅ Ollama Success (${duration}s):`);
        console.log('---------------------------------------------------');
        console.log(data.response.trim());
        console.log('---------------------------------------------------');
        return true;
    } catch (e: any) {
        console.error(`❌ Ollama Failed: ${e.message}`);
        return false;
    }
}

async function testGemini() {
    console.log(`\n☁️  Testing CLOUD Gemini [${GEMINI_MODEL}]...`);
    const start = Date.now();
    try {
        const apiKey = process.env['GOOGLE_API_KEY'];
        if (!apiKey) throw new Error('GOOGLE_API_KEY not found in env');

        console.log(`🔑 Gemini Key: ${apiKey.substring(0, 8)}...`);
        const gemini = new GeminiService(apiKey, GEMINI_MODEL);
        // Note: GeminiService defaults to gemini-2.0-flash-exp in our update
        const result = await gemini.generateContent(PROMPT);

        const duration = ((Date.now() - start) / 1000).toFixed(2);

        if (result.ok) {
            console.log(`✅ Gemini Success (${duration}s):`);
            console.log('---------------------------------------------------');
            console.log(result.value.trim());
            console.log('---------------------------------------------------');
            return true;
        } else {
            throw result.error;
        }
    } catch (e: any) {
        console.error(`❌ Gemini Failed: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log(`🧪 Starting Model Output Test\nPrompt: "${PROMPT}"`);

    // Run sequentially to see timing clearly
    await testOllama();
    await testGemini();

    console.log('\n🏁 Test Complete.');
}

main();
