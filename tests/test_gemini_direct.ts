
import 'dotenv/config';
import { GeminiService } from '../src/core/GeminiService.js';

async function main() {
    const apiKey = process.env['GOOGLE_API_KEY'];

    if (!apiKey) {
        console.error('❌ GOOGLE_API_KEY not found in environment.');
        process.exit(1);
    }

    console.log('🚀 Testing Gemini API Direct...');
    console.log(`🔑 Key found: ${apiKey.substring(0, 8)}...`);

    try {
        const service = new GeminiService(apiKey);
        const prompt = "Reply with exactly 'Gemini is Online'.";

        console.log(`📨 Sending prompt: "${prompt}"...`);
        const result = await service.generateContentStream(prompt);

        if (result.ok) {
            console.log('✅ Success!');
            console.log('🤖 Response:', result.value);
        } else {
            console.error('❌ API Error:', result.error);
        }

    } catch (error) {
        console.error('💥 Unexpected Error:', error);
    }
}

main();

