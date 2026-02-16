// Remove unused import
// 

async function mainDirectCfInference() {
    const accountId = '6872653edcee9c791787c1b783173793';
    const apiToken = 'BKPBdQcDbG4PQLnNo7nsZdYTdzC2CzROmWJCIYks';
    const model = '@cf/meta/llama-3.1-8b-instruct';

    console.log(`🧪 Testing direct inference on ${model}...\n`);

    try {
        const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Say hello' }]
            })
        });
        const data: any = await resp.json();
        if (resp.ok) {
            console.log(`✅ ${model} OK!`);
            console.log(`💬 Response: ${data.result.response}`);
        } else {
            console.log(`❌ ${model} FAILED: ${resp.status} - ${JSON.stringify(data.errors)}`);
        }
    } catch (e: any) {
        console.log(`❌ ERROR: ${e.message}`);
    }
}
mainDirectCfInference();
