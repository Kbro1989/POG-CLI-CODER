
import { getDashboardPath } from '../src/utils/SovereignPathResolver.js';


// Force D: drive detection for test if needed, but SovereignPathResolver handles it
// console.log('Checking Dashboard Path Resolution...');

const dashboardPath = getDashboardPath('test-project-123');
console.log(`Resolved Dashboard Path: ${dashboardPath}`);

if (dashboardPath.startsWith('D:\\') || dashboardPath.includes('pog-coder-vibe')) {
    console.log('✅ SUCCESS: Dashboard path resolves to Sovereign Root');
    process.exit(0);
} else {
    console.error('❌ FAILURE: Dashboard path did not resolve to Sovereign Root');
    console.error(`Expected D:\\... but got ${dashboardPath}`);
    process.exit(1);
}

