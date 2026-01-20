
import { BioIntelligenceLimb } from '../src/limbs/bio/BioIntelligenceLimb.js';
import { FreeModelRouter } from '../src/core/Router.js';
import { VibeConfig } from '../src/core/models.js';
import path from 'path';

// Mock Config
const mockConfig: VibeConfig = {
    projectId: 'test-project',
    projectRoot: process.cwd(),
    pogDir: path.join(process.cwd(), '.pog_coder_vibe'),
    enabledServices: [],
    agentName: 'POG-VIBE-TEST',
    wsPort: 3000,
    maxSnapshotAge: 86400000,
    circuitBreakerThreshold: 3,
    circuitBreakerCooldown: 10000,
    embeddingDimensions: 384,
    logLevel: 'info',
    errorTrackerModelPath: undefined
};

async function verifyHealthRouting() {
    console.log('🏥 Verifying Health Check Routing...\n');

    // 1. Check BioIntelligence Limb (Should be FALSE now)
    const bioLimb = new BioIntelligenceLimb(mockConfig);
    const bioResult = await bioLimb.canHandle({ prompt: 'health check' } as any);

    console.log(`BioIntelligenceLimb.canHandle('health check'): ${bioResult}`);
    if (bioResult === false) {
        console.log('✅ PASS: BioIntelligence correctly ignored "health check"');
    } else {
        console.log('❌ FAIL: BioIntelligence still captured "health check"');
    }

    // 2. Check Router (Should catch it now)
    const router = new FreeModelRouter(mockConfig, undefined);
    const routeResult = router.route('health check');

    if (routeResult.ok) {
        console.log(`Router Decision: ${routeResult.value}`);
        if (routeResult.value.includes('gemini') || routeResult.value.includes('diagnostic')) {
            console.log('✅ PASS: Router correctly handled diagnostic intent');
        } else {
            console.log(`⚠️ WARNING: Router picked ${routeResult.value}, expected diagnostic model`);
        }
    } else {
        console.log(`❌ FAIL: Router failed to route: ${routeResult.error?.message}`);
    }
}

verifyHealthRouting().catch(console.error);
