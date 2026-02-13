import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { VibeConfig } from '../src/core/models.js';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyEmergentSovereignty() {
    console.log('--- Phase 24: Emergent Sovereignty Verification ---');

    const config: VibeConfig = {
        projectId: 'verification-test',
        projectRoot: resolve('.'),
        pogDir: resolve('./.pog'),
        agentName: 'VerificationAgent',
        wsPort: 9001,
        maxSnapshotAge: 3600,
        circuitBreakerThreshold: 5,
        circuitBreakerCooldown: 60000,
        logLevel: 'info',
        workspaces: [resolve('.')],
        enabledServices: ['ollama', 'gemini'],
        embeddingDimensions: 768,
        sovereignBoundaries: {
            maxLatencyMs: 5000,
            dailyBudgetUsd: 10,
            allowCloud: true
        },
        gutenbergPath: undefined
    };

    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);

    const orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);

    console.log('1. Testing Latency Pressure...');
    // Simulate high latency
    (orchestrator as any).neuralLatency = 200; // 2x the limit

    // Monitor for boundary negotiation event
    let eventReceived = false;
    orchestrator.on('intentExecuted' as any, (data: any) => {
        if (data.output?.includes('Constitutional Shift')) {
            console.log('✅ Boundary Negotiation Triggered in Narrative');
            eventReceived = true;
        }
    });

    // Mock broadcastToDashboard to verify event emission
    const originalBroadcast = (orchestrator as any).broadcastToDashboard.bind(orchestrator);
    let negotiationEventEmitted = false;
    (orchestrator as any).broadcastToDashboard = (type: string, data: any) => {
        if (type === 'boundary_negotiation') {
            console.log('✅ Event Received: boundary_negotiation');
            console.log(`   Type: ${data.type}`);
            console.log(`   Reason: ${data.reason}`);
            negotiationEventEmitted = true;
        }
        originalBroadcast(type, data);
    };

    console.log('2. Executing Intent under Pressure...');
    const result = await orchestrator.executeIntent('Hello, verify my boundaries.');

    if (result.ok) {
        console.log('Intent completed successfully.');
    } else {
        console.error('Intent failed:', result.error);
    }

    if (eventReceived) {
        console.log('✅ Narrative acknowledgement received.');
    }

    if (negotiationEventEmitted) {
        console.log('--- Verification SUCCESS ---');
        process.exit(0);
    } else {
        console.error('--- Verification FAILED: No negotiation event emitted ---');
        process.exit(1);
    }
}

verifyEmergentSovereignty().catch(e => {
    console.error('Verification failed with error:', e);
    process.exit(1);
});
