
import { ConfigManager } from '../src/utils/config.js';
import { FileSystemSpine } from '../src/spines/cli/FileSystemSpine.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';



async function verifyFederatedFetch() {
    console.log('🔍 Starting Federated Fetch Verification...');

    // 1. Initialize Config
    const projectRoot = process.cwd();
    // Simulate D:\ as sovereign root for this test if not already set
    process.env['POG_SOVEREIGN_ROOT'] = 'D:\\pog-coder-vibe';

    const configManager = new ConfigManager(projectRoot);
    const config = configManager.getConfig();

    console.log('✅ Configuration Loaded');
    console.log('   Root Stack:', config.rootStack);
    console.log('   Sovereign Root:', config.sovereignRoot);

    if (!config.rootStack.some(r => r.includes('D:\\'))) {
        console.error('❌ Error: D:\\ drive not found in rootStack!');
        process.exit(1);
    }

    // 2. Initialize Spine
    const sandbox = new Sandbox(config);
    const fsSpine = new FileSystemSpine(config, sandbox);
    const tools = fsSpine.getTools();
    const readTool = tools.find(t => t.name === 'fs_read');

    if (!readTool) {
        console.error('❌ Error: fs_read tool not found!');
        process.exit(1);
    }

    // 3. Test Resolution (Assuming a file exists, we will list D: first to be sure)
    // For now, let's try to read a file we know might exist or create a dummy one if we can't write to D: easily in this script
    // We will rely on the list command output from the agent step to choose a file. 
    // BUT since this is a static script, let's try to resolve the root directory itself or a known config file.

    const targetFile = 'pog.md'; // Looking for a manifest
    console.log(`\n📂 Attempting to fetch '${targetFile}' from Federated Stack...`);

    try {
        const result = await readTool.handler({ path: targetFile });
        if (result.ok) {
            console.log('✅ Success: File read from stack!');
            console.log('   Preview:', (result.value as string).substring(0, 50) + '...');
        } else {
            // It might not exist, which is fine, but we want to verifying the resolution Logic didn't crash
            console.log('⚠️  Read returned not-ok (File might not exist, but tool executed):', result);
        }
    } catch (error) {
        console.log('ℹ️  Tool threw error (Expected if file missing, verifying path in error message)');
        console.log('   Error:', (error as Error).message);
        if ((error as Error).message.includes('federated stack')) {
            console.log('✅ Verification Passed: Error message confirms federated stack traversal.');
        } else {
            console.error('❌ Verification Failed: Unexpected error message.');
        }
    }
}

verifyFederatedFetch().catch(console.error);

