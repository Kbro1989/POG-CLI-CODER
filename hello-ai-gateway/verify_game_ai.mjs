
import fetch from 'node-fetch';

async function runTests() {
    console.log("Verifying Merged Game + AI Server...");

    // 1. Test Game Server Health
    try {
        const health = await fetch('http://localhost:8788/health');
        console.log(`[Game] Health Check: ${health.status} ${await health.text()}`);
    } catch (e) {
        console.error(`[Game] Health Check Failed: ${e.message}`);
    }

    // 2. Test AI Gateway
    try {
        const response = await fetch('http://localhost:8788', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: '@cf/meta/llama-3.1-8b-instruct',
                messages: [{ role: 'user', content: 'Hello from merged server!' }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`[AI] Response: Success! (Response length: ${JSON.stringify(data).length})`);
        } else {
            console.error(`[AI] Failed: ${response.status} ${await response.text()}`);
        }
    } catch (e) {
        console.error(`[AI] Connection Failed: ${e.message}`);
    }
}

// Wait for server start
setTimeout(runTests, 4000);
