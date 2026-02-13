import * as dotenv from 'dotenv';
import { SystemEnvChecker } from '../src/utils/SystemEnvChecker.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

dotenv.config();

/**
 * POG-VIBE Medical Diagnostic
 * Seat of Metabolic Health & Environmental Readiness
 */
async function runDiagnostic() {
    console.log('\n--- 🩺 POG-VIBE MEDICAL DIAGNOSTIC ---');

    const statuses = await SystemEnvChecker.checkGlobalSettings();

    console.table(statuses.map(s => ({
        Component: s.key,
        Status: s.active ? '✅ READY' : '❌ MISSING',
        Source: s.source,
        Trace: s.value
    })));

    const readyCount = statuses.filter(s => s.active).length;
    console.log(`\nOverall Health Index: ${readyCount}/${statuses.length} nodes active.`);

    if (readyCount < statuses.length) {
        console.warn('\n[!] METABOLIC ALERT: Some system nodes are inactive. Check .env or PATH.');
    } else {
        console.log('\n[+] SYSTEM STABLE: All neurological substrates confirmed.');
    }

    // Redirect to tests/outputs
    try {
        const outputsDir = join(process.cwd(), 'tests', 'outputs');
        if (!existsSync(outputsDir)) mkdirSync(outputsDir, { recursive: true });
        const reportPath = join(outputsDir, 'medical_report.json');
        writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            statuses,
            healthIndex: `${readyCount}/${statuses.length}`
        }, null, 2));
    } catch (err) {
        // Silent fail for redirection
    }
}

runDiagnostic();
