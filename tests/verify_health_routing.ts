
import { BioIntelligenceLimb } from '../src/limbs/bio/BioIntelligenceLimb.js';
import { FreeModelRouter } from '../src/core/Router.js';
import { ConfigManager } from '../src/utils/config.js';

// 0. Initialize Real Config (NO MOCKS Law)
const projectRoot = process.cwd();
const configManager = new ConfigManager(projectRoot);
const config = configManager.getConfig();

async function verifyHealthRouting() {
    console.log('🏥 Verifying Health Check Routing...\n');

    // 1. Check BioIntelligence Limb (Should be FALSE now)
    const bioLimb = new BioIntelligenceLimb(config);
    const bioResult = await bioLimb.canHandle({ prompt: 'health check' } as any);

    console.log(`BioIntelligenceLimb.canHandle('health check'): ${bioResult}`);
    if (bioResult === 'Yin') {
        console.log('✅ PASS: BioIntelligence correctly ignored "health check"');
    } else {
        console.log('❌ FAIL: BioIntelligence still captured "health check"');
    }

    // 2. Check Router (Should catch it now)
    const router = new FreeModelRouter(config, undefined);
    const routeResult = await router.route('health check');

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

