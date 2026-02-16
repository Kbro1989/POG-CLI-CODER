
import { MonitorAgent, MonitorReport } from '../src/monitor/MonitorAgent.js';
import { ModelExecutor } from '../src/core/ModelExecutor.js';
import { VibeConfig } from '../src/core/models.js';

// Mock Executor
const mockExecutor = {
    callModel: async () => ({ ok: true, value: { response: 'low' } }),
    embed: async () => ({ ok: false, error: new Error('Not implemented') })
} as unknown as ModelExecutor;

async function verifySelfHealing() {
    console.log('🩺 Verifying Self-Healing Integration...\n');

    const config: VibeConfig = {
        pogDir: process.cwd(),
        rootStack: [], projectRoot: process.cwd(),
        projectId: 'test-heal',
        agentName: 'HEALER',
        wsPort: 3000,
        maxSnapshotAge: 86400000,
        circuitBreakerThreshold: 3,
        circuitBreakerCooldown: 60000,
        embeddingDimensions: 768,
        logLevel: 'info',
        enabledServices: [],
        workspaces: [process.cwd()],
        environment: 'local'
    };

    const hexagramManager = { pinCard: async () => ({ ok: true, value: undefined }), pinCognitiveCard: async () => ({ ok: true, value: undefined }) } as any;
    const monitor = new MonitorAgent(config, mockExecutor, hexagramManager);

    // Promise to wait for event
    const eventPromise = new Promise<MonitorReport>((resolve) => {
        monitor.on('issueDetected', (report) => {
            resolve(report);
        });
    });

    // Simulate External Report from VS Code
    const externalReport: MonitorReport = {
        timestamp: Date.now(),
        severity: 'high',
        category: 'tsc',
        description: 'Simulated VS Code Error',
        affectedFiles: ['/src/test.ts'],
        suggestedAction: 'Fix it',
        tscErrors: []
    };

    console.log('1. Reporting external issue...');
    monitor.reportExternalIssues(externalReport);

    console.log('2. Waiting for detection...');
    const detected = await eventPromise;

    if (detected.description === 'Simulated VS Code Error') {
        console.log('\n✅ SUCCESS: MonitorAgent successfully ingested external report!');
        console.log(`   Category: ${detected.category}`);
        console.log(`   Severity: ${detected.severity}`);
    } else {
        console.error('\n❌ FAILURE: Reported issue did not match received event.');
    }
}

verifySelfHealing().catch(console.error);

