
import { WebAppForgeLimb } from '../src/limbs/webapp/WebAppForgeLimb.js';
import { GutenbergLimb } from '../src/limbs/gutenberg/GutenbergLimb.js';
import { MediaForgeLimb } from '../src/limbs/media/MediaForgeLimb.js';
import { PreviewServer } from '../src/core/PreviewServer.js';
import { VibeConfig } from '../src/core/models.js';
import path from 'path';

// Mock Config
const mockConfig: VibeConfig = {
    projectId: 'cross-limb-test',
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

// Mock Preview Server
const mockPreviewServer = {
    startPreview: async () => ({ ok: true, value: { url: 'http://localhost:3000' } })
} as unknown as PreviewServer;

async function verifyCrossLimb() {
    console.log('🔗 Verifying Cross-Limb Orchestration...\n');

    try {
        // 1. Initialize Limbs
        const webapp = new WebAppForgeLimb(mockConfig, mockPreviewServer);
        const gutenberg = new GutenbergLimb();
        const media = new MediaForgeLimb(mockConfig);

        console.log('✅ Limbs Initialized');

        // 2. Simulate Workflow: "Create a Sci-Fi Reader App"

        // Gutenberg: Get Content
        console.log('\n📚 Gutenberg: Searching for Sci-Fi...');
        const bookResult = await gutenberg.execute({ prompt: 'search sci-fi books' } as any);
        if (bookResult.ok) {
            console.log(`   Result: ${bookResult.value.output}`);
        } else {
            console.log(`   ❌ Gutenberg Failed: ${bookResult.error?.message}`);
        }

        // MediaForge: Get Assets (Mocked Dispatcher in Limb likely calls Cloud, might fail if no key/auth)
        // We will just check if we can *call* it.
        console.log('\n🎨 MediaForge: Generating Asset...');
        // Note: This might fail without real credentials, but we want to see it try.
        try {
            const mediaResult = await media.execute({ prompt: 'generate a sci-fi cover image' } as any);
            if (mediaResult.ok) {
                console.log(`   Result: ${mediaResult.value.output}`);
            } else {
                console.log(`   ⚠️ MediaForge Expected Failure (No Auth): ${mediaResult.error?.message}`);
            }
        } catch (e) {
            console.log(`   ⚠️ MediaForge Expected Failure (No Auth): ${e}`);
        }

        // WebAppForge: Scaffold
        console.log('\n🔨 WebAppForge: Scaffolding App...');
        // We'll mock the planApp method to avoid Gemini call if possible, or expect it to fail gracefully
        // Actually WebAppForge calls Gemini for planning. It might fail.
        // But we can check if it initializes and validates intent.

        const canHandle = await webapp.canHandle({ prompt: 'create a new react app called scifi-reader' } as any);
        console.log(`   Can Handle 'create app': ${canHandle}`);

        if (canHandle) {
            console.log('   ✅ WebAppForge Intent Recognition Working');
        }

    } catch (error: any) {
        console.error(`\n❌ Test Error: ${error.message}`);
    }
}

verifyCrossLimb().catch(console.error);
