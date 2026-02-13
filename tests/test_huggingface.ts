import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Standard Hugging Face Key Test Script
 * Verifies if the hf_... key has valid inference permissions.
 */

async function testHuggingFace() {
    const apiKey = process.env['HUGGINGFACE_API_KEY'];
    if (!apiKey) {
        console.error('❌ HUGGINGFACE_API_KEY not found in .env');
        process.exit(1);
    }

    const modelId = 'moonshotai/Kimi-K2.5:novita';
    console.log(`📡 Testing Hugging Face key with model: ${modelId}...`);

    try {
        const response = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: "user", content: "Describe the Sovereign Substrate in one sentence." }
                ],
                max_tokens: 50
            })
        });

        const data: any = await response.json();

        if (!response.ok) {
            console.error('❌ Hugging Face API Error:');
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        console.log('✅ Hugging Face API Success!');
        console.log('--- Response ---');
        console.log(JSON.stringify(data, null, 2));
        console.log('----------------');

    } catch (error: any) {
        console.error('❌ Request failed:');
        console.error(error.message);
        process.exit(1);
    }
}

testHuggingFace();
