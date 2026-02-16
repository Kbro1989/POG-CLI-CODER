
import { KeyVault } from '../src/utils/KeyVault.js';

async function main() {
    const vault = new KeyVault();
    const apiKey = vault.getCurrentKey();
    if (!apiKey) {
        console.error('No API key');
        return;
    }

    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data: any = await resp.json();
        if (resp.ok) {
            console.log('Available Models:');
            data.models.forEach((m: any) => {
                console.log(`- ${m.name.replace('models/', '')}: ${m.displayName}`);
            });
        } else {
            console.log(`❌ ERROR ${resp.status}: ${JSON.stringify(data.error)}`);
        }
    } catch (e: any) {
        console.log(`❌ CRITICAL: ${e.message}`);
    }
}
main();

