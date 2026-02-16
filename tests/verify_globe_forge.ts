import { CloudflareLimb } from '../src/limbs/cloud/CloudflareLimb.js';
import { VibeConfig } from '../src/core/models.js';
import * as fs from 'fs';
import { join } from 'path';
import pino from 'pino';

const testLogger = pino({ name: 'VerifyGlobeForge' });

async function verify() {
    testLogger.info('--- STARTING GLOBE FORGE VERIFICATION ---');

    const config: VibeConfig = {
        projectId: 'test-forge',
        pogDir: './.pog_test',
        rootStack: [], projectRoot: process.cwd(),
        agentName: 'ForgeVerifier',
        wsPort: 9999,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldown: 60000,
        logLevel: 'info',
        enabledServices: [],
        embeddingDimensions: 768,
        environment: 'local',
        gutenbergPath: 'D:\\sovereign\\pog-gutenberg',
        cloudflareAccountId: process.env['CLOUDFLARE_ACCOUNT_ID'] || '',
        cloudflareApiToken: process.env['CLOUDFLARE_API_TOKEN'] || '',
        workspaces: [process.cwd()]
    };

    if (!fs.existsSync(config.pogDir)) {
        fs.mkdirSync(config.pogDir, { recursive: true });
    }

    const limb = new CloudflareLimb(config);

    // 1. Verify cf_get_gps
    console.log('\n[1/3] Verifying cf_get_gps...');
    const gpsResult = await limb.handleToolCall('cf_get_gps', {});
    console.log('GPS Result:', JSON.stringify(gpsResult.ok ? gpsResult.value : gpsResult.error, null, 2));
    const gpsData = (gpsResult.ok ? gpsResult.value.data : {}) as Record<string, unknown>;
    if (!gpsResult.ok || (gpsData['lat'] as number) !== 34.0522) {
        throw new Error('GPS verification failed');
    }

    // 2. Verify cf_forge_multiplayer_globe
    console.log('\n[2/3] Verifying cf_forge_multiplayer_globe...');
    const targetDir = join(config.pogDir, 'forged-globe-test');
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }

    const forgeResult = await limb.handleToolCall('cf_forge_multiplayer_globe', { targetDir });
    console.log('Forge Result OK:', forgeResult.ok);

    if (forgeResult.ok) {
        const wranglerPath = join(targetDir, 'wrangler.json');
        const gpsPath = join(targetDir, 'src', 'gps.json');

        if (fs.existsSync(wranglerPath) && fs.existsSync(gpsPath)) {
            console.log('Scaffolded files found at:', targetDir);
            const gpsContent = JSON.parse(fs.readFileSync(gpsPath, 'utf8'));
            console.log('Scaffolded GPS:', JSON.stringify(gpsContent, null, 2));
        } else {
            throw new Error('Scaffolding failed: Missing critical files');
        }
    } else {
        throw new Error(`Forge failed: ${forgeResult.error?.message}`);
    }

    // 3. Verify Dashboard Event Emission
    console.log('\n[3/3] Verifying Event Emission...');
    let eventReceived = false;
    limb.on('globe_forge_completed', (data: Record<string, unknown>) => {
        console.log('Received globe_forge_completed event:', data['path']);
        eventReceived = true;
    });

    // Run forge again to trigger event
    await limb.handleToolCall('cf_forge_multiplayer_globe', { targetDir: targetDir + '_event' });

    if (eventReceived) {
        console.log('Event emission verified!');
    } else {
        throw new Error('Event emission failed');
    }

    console.log('\n--- VERIFICATION SUCCESSFUL ---');
    process.exit(0);
}

verify().catch(err => {
    console.error('Verification FAILED:', err);
    process.exit(1);
});

