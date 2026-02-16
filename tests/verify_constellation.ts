import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { VibeConfig } from '../src/core/models.js';
import { CloudflareLimb } from '../src/limbs/cloud/CloudflareLimb.js';
import * as path from 'path';

async function verifyConstellation() {
    console.log('--- CONSTELLATION VERIFICATION ---');

    const config: VibeConfig = {
        pogDir: path.resolve('./.pog'),
        rootStack: [], projectRoot: path.resolve('.'),
        agentName: 'POG-VERIFIER',
        wsPort: 9005,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldown: 60000,
        embeddingDimensions: 768,
        logLevel: 'info',
        projectId: 'verification-test',
        enabledServices: [],
        cloudflareAccountId: 'test-account',
        gutenbergPath: undefined,
        workspaces: [process.cwd()],
        environment: 'local'
    };

    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);
    const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

    await orchestrator.initialize();

    const cfLimb = orchestrator['limbs'].find(l => l.id === 'cloudflare_ai') as CloudflareLimb;

    if (!cfLimb) {
        console.error('CloudflareLimb not found in orchestrator');
        process.exit(1);
    }

    console.log('Simulating regional health updates...');

    // Simulate a successful regional pulse
    cfLimb.emit('spatial_health_update', {
        region: 'us-east',
        provider: 'cloudflare',
        lat: 40.7128,
        lng: -74.0060,
        health: 'READY',
        latency: 45
    });

    console.log('Simulating a failover event (Substrate Constraint Triggered)...');

    // Simulate a failure causing failover tracer
    cfLimb.emit('failover_tracer', {
        from: 'cloudflare:us-east',
        to: 'ghost:local',
        reason: 'RATE_LIMITED',
        region: 'us-east'
    });

    console.log('Synchronizing constellation... (Multiplayer Discovery)');
    await cfLimb.handleToolCall('cf_sync_constellation', {
        nodeId: 'local-node-verifier',
        region: 'us-west'
    });

    // Simulate experienced health degradation
    cfLimb.emit('spatial_health_update', {
        region: 'us-east',
        provider: 'cloudflare',
        lat: 40.7128,
        lng: -74.0060,
        health: 'DEGRADED',
        latency: 850 // Boundary breached
    });

    console.log('Constellation Telemetry Emitted. Check Dashboard Viewport.');

    // Wait for events to propagate
    await new Promise(r => setTimeout(r, 2000));

    console.log('Verification Complete.');
    await orchestrator.cleanup();
    process.exit(0);
}

verifyConstellation().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});

