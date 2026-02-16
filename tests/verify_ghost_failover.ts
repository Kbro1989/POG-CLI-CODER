import { GhostLimb } from '../src/limbs/core/GhostLimb.js';
import { VibeConfig } from '../src/core/models.js';

const mockConfig: VibeConfig = {
    pogDir: './tmp/ghost-test',
    rootStack: [], projectRoot: process.cwd(),
    agentName: 'GHOST-VERIFIER',
    wsPort: 8888,
    maxSnapshotAge: 1000,
    circuitBreakerThreshold: 3,
    circuitBreakerCooldown: 1000,
    embeddingDimensions: 768,
    logLevel: 'info',
    projectId: 'ghost-test',
    enabledServices: [],
    gutenbergPath: undefined,
    workspaces: [process.cwd()],
    environment: 'local'
};

async function verifyGhostHardening() {
    console.log('👻 Starting Ghost Limb Hardening Verification...');
    const ghost = new GhostLimb(mockConfig);

    // 1. Initial State Check
    const status1 = ghost.getStatus();
    console.log(`Initial Engagement: ${status1['engagementLevel']}`);
    if (status1['engagementLevel'] !== 'Yin') throw new Error('Ghost should start passive (Yin)');

    // 2. Simulate Cloud Failures
    console.log('Reporting 3 cloud failures...');
    ghost.reportCloudHealth(false);
    ghost.reportCloudHealth(false);
    ghost.reportCloudHealth(false);

    const status2 = ghost.getStatus();
    console.log(`Post-failure Engagement: ${status2['engagementLevel']}`);
    if (status2['engagementLevel'] !== 'Yang') throw new Error('Ghost should be at Yang (Master) after 3 failures');

    // 3. Local Narrative Verification
    console.log('Verifying local narrative generation...');
    const metrics = { cpu: 85, mem: 40, disk: 10 };
    const narrative = ghost.generateLocalNarrative(metrics);
    console.log(`Generated Narrative: ${narrative}`);
    if (!narrative.includes('COMMAND_ACTIVE') || !narrative.includes('HIGH_LOAD')) {
        throw new Error('Narrative did not reflect Yang state or metrics');
    }

    // 4. Intent Routing Verification (Yang)
    console.log('Verifying crisis intent routing...');
    const crisisDecision = await ghost.canHandle({ prompt: 'emergency hard reset needed' });
    if (crisisDecision !== 'Yang') throw new Error('Crisis intent should return Yang');

    // 5. Intent Routing Verification (YinYang)
    console.log('Verifying narrative intent routing...');
    const vibeDecision = await ghost.canHandle({ prompt: 'give me the system vibe' });
    if (vibeDecision !== 'YinYang') throw new Error('Vibe intent should return YinYang (Validation/Support)');

    // 6. Reset Check (Simulate Cloud Recovery)
    console.log('Reporting 3 cloud successes...');
    ghost.reportCloudHealth(true);
    ghost.reportCloudHealth(true);
    ghost.reportCloudHealth(true);
    ghost.reportCloudHealth(true);
    ghost.reportCloudHealth(true);

    const status3 = ghost.getStatus();
    console.log(`Post-recovery Engagement: ${status3['engagementLevel']}`);
    if (status3['engagementLevel'] !== 'Yin') throw new Error('Ghost should return to passive (Yin) after recovery');

    console.log('✅ Ghost Limb Hardening Verified Successfully!');
}

verifyGhostHardening().catch(err => {
    console.error('❌ Verification Failed:', err.message);
    process.exit(1);
});

