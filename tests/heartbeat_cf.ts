import { CloudflareServices } from '../src/services/CloudflareServices.js';
import { VibeConfig } from '../src/core/models.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkCloudflare() {
    console.log('--- Cloudflare Heartbeat ---');

    const config: VibeConfig = {
        cloudflareAccountId: process.env['CLOUDFLARE_ACCOUNT_ID'],
        cloudflareApiToken: process.env['CLOUDFLARE_API_TOKEN'],
        gatewayUrl: process.env['CLOUDFLARE_GATEWAY_URL'],
        projectId: 'heartbeat'
    } as any;

    const cf = new CloudflareServices({
        accountId: config.cloudflareAccountId!,
        apiToken: config.cloudflareApiToken!
    });

    console.log('Testing AI Run (@cf/meta/llama-3.1-8b-instruct)...');
    const result = await cf.runAi('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: 'Say "Ready to Take on the World"' }]
    });

    if (result.ok) {
        console.log('SUCCESS:', (result.value as any).response || JSON.stringify(result.value));
    } else {
        console.error('FAILURE:', result.error);
    }
}

checkCloudflare().catch(console.error);

