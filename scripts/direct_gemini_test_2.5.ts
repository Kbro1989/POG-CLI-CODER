
import { KeyVault } from '../src/utils/KeyVault.js';

async function main() {
    const vault = new KeyVault();
    const apiKey = vault.getCurrentKey();
    if (!apiKey) {
        console.error('No API key');
        return;
    }

    const models = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const model of models) {
        console.log(`Testing ${model}...`);
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'rumors?' }] }]
                })
            });
            const data: any = await resp.json();
            if (resp.ok) {
                console.log(`✅ ${model} OK: ${data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50)}...`);
            } else {
                console.log(`❌ ${model} ERROR ${resp.status}: ${JSON.stringify(data.error)}`);
            }
        } catch (e: any) {
            console.log(`❌ ${model} CRITICAL: ${e.message}`);
        }
    }
}
main();
