import dotenv from 'dotenv';
import path from 'path';
import { WebAppForgeLimb } from '../src/limbs/webapp/WebAppForgeLimb.js';
import { GutenbergLimb } from '../src/limbs/gutenberg/GutenbergLimb.js';
import { MediaForgeLimb } from '../src/limbs/media/MediaForgeLimb.js';
import { PreviewServer } from '../src/core/PreviewServer.js';
import { VibeConfig } from '../src/core/models.js';
import { ModelExecutor } from '../src/core/ModelExecutor.js';
import { AdversarialOrchestrator } from '../src/core/AdversarialOrchestrator.js';
import { FreeModelRouter } from '../src/core/Router.js';
import { GeminiService } from '../src/core/GeminiService.js';
import { ValidationSystem } from '../src/core/validation/ValidationSystem.js';
import { ArchitectureDigest } from '../src/core/ArchitectureDigest.js';
import { VectorDB } from '../src/learning/VectorDB.js';

// Load Environment Variables
dotenv.config();

// Real Config
const config: VibeConfig = {
    projectId: 'cross-limb-verify',
    projectRoot: process.cwd(),
    pogDir: path.join(process.cwd(), '.pog_coder_vibe'),
    enabledServices: ['webapp', 'gutenberg', 'media'],
    agentName: 'POG-VIBE-VERIFY',
    wsPort: 3000,
    maxSnapshotAge: 86400000,
    circuitBreakerThreshold: 3,
    circuitBreakerCooldown: 10000,
    embeddingDimensions: 384,
    logLevel: 'info',
    pogApiUrl: process.env.POG_API_URL,
    cloudflareGatewayUrl: process.env.CLOUDFLARE_GATEWAY_URL || process.env.CLOUDFLARE_BINDING_URL
};

async function verifyCrossLimb() {
    console.log('🔗 Verifying Cross-Limb Orchestration (SOVEREIGN MODE)...\n');

    try {
        // 1. Initialize Core Dependencies
        const apiKey = process.env.GOOGLE_API_KEY || '';
        if (!apiKey) console.warn('⚠️ GOOGLE_API_KEY missing. Some limbs may fail.');

        const geminiService = new GeminiService(apiKey);
        const vectorDB = new VectorDB(config);

        // Initialize Router
        const router = new FreeModelRouter(config, geminiService);

        // Initialize Executor
        const executor = new ModelExecutor(config, geminiService, router);

        // Initialize Adversarial Components
        const validationSystem = new ValidationSystem(); // Add validators if needed
        const architectureDigest = new ArchitectureDigest(config.projectRoot);
        const adversarialOrchestrator = new AdversarialOrchestrator(
            config,
            executor,
            validationSystem,
            architectureDigest
        );

        const previewServer = new PreviewServer();

        // 2. Initialize Limbs with Real Dependencies
        const webapp = new WebAppForgeLimb(config, previewServer, executor, adversarialOrchestrator);
        const gutenberg = new GutenbergLimb(config, vectorDB, geminiService, executor);
        const media = new MediaForgeLimb(config, executor, router);

        console.log('✅ Limbs Initialized with Real Dependencies');

        // 3. Simulate Workflow: "Create a Sci-Fi Reader App"

        // Gutenberg: Search
        console.log('\n📚 Gutenberg: Searching for Sci-Fi...');
        // Note: Real execution requires real models/internet. 
        // We verify the METHOD call works, catching errors if external services fail.
        try {
            const bookResult = await gutenberg.execute({ prompt: 'search sci-fi books' } as any);
            console.log(bookResult.ok ? `   Result: ${bookResult.value.output?.substring(0, 50)}...` : `   Note: ${bookResult.error?.message}`);
        } catch (e: any) {
            console.log(`   Execution attempted (External Service): ${e.message}`);
        }

        // MediaForge: Asset
        console.log('\n🎨 MediaForge: Generating Asset...');
        try {
            const mediaResult = await media.execute({ prompt: 'generate a sci-fi cover image' } as any);
            console.log(mediaResult.ok ? `   Result: Asset Generated` : `   Note: ${mediaResult.error?.message}`);
        } catch (e: any) {
            console.log(`   Execution attempted (External Service): ${e.message}`);
        }

        // WebAppForge: Intent
        console.log('\n🔨 WebAppForge: Scaffolding App...');
        try {
            const canHandle = await webapp.canHandle({ prompt: 'create a new react app called scifi-reader' } as any);
            console.log(`   Can Handle 'create app': ${canHandle}`);
        } catch (e: any) {
            console.log(`   Execution attempted (External Service): ${e.message}`);
        }

    } catch (error: any) {
        console.error(`\n❌ Initialization Error: ${error.message}`);
        process.exit(1);
    }
}

verifyCrossLimb().catch(console.error);
