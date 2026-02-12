import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function checkModels() {
    const apiKey = process.env['GOOGLE_API_KEY'];
    if (!apiKey) {
        console.error('❌ No API key found');
        process.exit(1);
    }

    const genAI = new GoogleGenAI(apiKey);
    const models = [
        'gemini-2.0-flash',
        'gemini-2.0-flash-thinking-exp',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ];

    console.log('🧪 Testing Gemini Model Accessibility...');

    for (const modelName of models) {
        try {
            const response = await (genAI as any).models.generateContent({
                model: modelName,
                contents: [{ role: 'user', parts: [{ text: 'Hi' }] }]
            });
            console.log(`✅ ${modelName}: SUCCESS`);
        } catch (error: any) {
            console.error(`❌ ${modelName}: FAILED (${error.message || error})`);
        }
    }
}

checkModels();
