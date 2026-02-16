import { AIDispatcher } from '../src/api/ai/Dispatcher.js';
import { VibeConfig } from '../src/core/models.js';
import dotenv from 'dotenv';

dotenv.config();

const config: VibeConfig = {
    projectId: 'trinity-test',
    rootStack: [], projectRoot: process.cwd(),
    pogDir: './.pog',
    agentName: 'TrinityTester',
    wsPort: 9003,
    maxSnapshotAge: 3600,
    circuitBreakerThreshold: 5,
    circuitBreakerCooldown: 60000,
    logLevel: 'info',
    enabledServices: [],
    embeddingDimensions: 768,
    gutenbergPath: undefined,
    workspaces: [process.cwd()],
    environment: 'local'
};

async function testFailover() {
    console.log('🚀 Starting Trinity Substrate Failover Test...');
    const dispatcher = new AIDispatcher(config as any);

    // We will use a capability that points to Gemini, but we'll deliberately mess with it to trigger fallbacks
    const targetCapability = 'gold_gemini_2_5_pro';
    console.log(`📡 Dispatching to ${targetCapability} (Reasoning Tier)...`);

    // In a real scenario, this would fail if Gemini is 429. Here we just expect it to work or cascade.
    try {
        const response = await dispatcher.dispatch({
            capabilityId: targetCapability,
            payload: 'Explain the Utilitarian Trinity substrate in one sentence.'
        });

        console.log('\n🏁 Final Dispatch Result:');
        console.log(`   Success: ${response.success}`);
        console.log(`   Service Used: ${response.serviceUsed}`);
        console.log(`   Model State: ${response.state}`);
        console.log(`   Response: ${typeof response.result === 'string' ? response.result.substring(0, 100) : JSON.stringify(response.result).substring(0, 100)}...`);

        if (response.serviceUsed !== 'GEMINI') {
            console.log('\n✅ SUCCESSFULLY FAILED BACK! Trinity Substrate Cascaded correctly.');
        } else {
            console.log('\n⚠️ Did not fail back (Gemini might be available again).');
        }
    } catch (e: any) {
        console.error(`\n❌ CRITICAL FAILURE: ${e.message}`);
    }
}

testFailover();

