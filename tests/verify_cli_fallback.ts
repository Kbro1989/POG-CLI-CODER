
import { ModelExecutor } from '../src/core/ModelExecutor.js';
import { VibeConfig } from '../src/core/models.js';

// Mock Config
const mockConfig: VibeConfig = {
    agentName: 'TEST_AGENT',
    // rootPath removed as it does not exist in VibeConfig
    ollamaModelsPath: 'D:\\ollama-models',
    // Replaced cloudflareWorkerUrl with the correct property as per models.ts definition or just using cloudflareGatewayUrl if that's the only one needed.
    // Checking src/core/models.ts, VibeConfig has:
    // cloudflareGatewayUrl?: string | undefined;
    // It DOES NOT have cloudflareWorkerUrl.
    cloudflareGatewayUrl: 'https://invalid-gateway.dev',

    // Filling other required properties to satisfy VibeConfig
    pogDir: 'D:\\pog-coder-vibe',
    projectRoot: '.',
    wsPort: 8765,
    maxSnapshotAge: 3600,
    circuitBreakerThreshold: 5,
    circuitBreakerCooldown: 60000,
    embeddingDimensions: 768,
    logLevel: 'info',
    projectId: 'TEST_PROJECT',
    enabledServices: []
};

async function runTest() {
    console.log('🧪 Starting CLI Fallback Verification...');

    // 1. Initialize Executor with NO API keys to force failures
    process.env['GOOGLE_API_KEY'] = ''; // Ensure Gemini SDK fails
    process.env['CLOUDFLARE_API_KEY'] = ''; // Ensure Cloudflare SDK fails
    process.env['CLOUDFLARE_API_TOKEN'] = '';

    const executor = new ModelExecutor(mockConfig, undefined);

    // 2. Attempt a call that should cascade to Sovereign CLI
    console.log('➡️  Triggering Fallback Chain...');

    // We expect this to fail gracefully or return a specific error if CLI is missing, 
    // but the point is to verify the *attempt*.
    const result = await executor.callModel('gemini-2.0-flash', 'Hello from fallback test');

    if (result.ok) {
        console.log('✅ Success:', result.value);
        if (result.value.model === 'cli:gemini-y') {
            console.log('🎉 Verified: Result came from Sovereign CLI!');
        } else {
            console.log('⚠️  Result came from unexpected source:', result.value.model);
        }
    } else {
        console.log('❌ Failed (Expected if CLI tool is missing):');
        console.log('   Error:', result.error.message);

        // Check if the error message chain indicates we tried Sovereign CLI
        if (result.error.message.includes('Sovereign CLI')) {
            console.log('🎉 Verified: Fallback chain reached Sovereign CLI step!');
        } else {
            console.log('⚠️  Fallback chain might have stopped early.');
        }
    }
}

runTest().catch(console.error);
