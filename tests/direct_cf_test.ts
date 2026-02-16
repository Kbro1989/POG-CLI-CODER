


async function mainDirectCf() {
    const accountId = '6872653edcee9c791787c1b783173793';
    const apiKey = '9edfd6891042bede27f3899e34a057b7a5683';
    const email = 'kristain33rs@gmail.com';

    console.log('🧪 Listing Cloudflare Workers AI Models via Global API Key...\n');

    try {
        const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=100`, {
            headers: {
                'X-Auth-Key': apiKey,
                'X-Auth-Email': email,
                'Content-Type': 'application/json'
            }
        });
        const data: any = await resp.json();
        if (resp.ok) {
            console.log('✅ Models Found:');
            data.result.forEach((m: any) => console.log(` - ${m.id} (${m.name})`));
        } else {
            console.log(`❌ FAILED: ${resp.status} - ${JSON.stringify(data.errors)}`);
        }
    } catch (e: any) {
        console.log(`❌ ERROR: ${e.message}`);
    }
}
mainDirectCf();

