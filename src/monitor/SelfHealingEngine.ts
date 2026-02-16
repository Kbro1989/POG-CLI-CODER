import pino from 'pino';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TSCError } from './TSCMonitor.js';
import { CognitiveChoice, BuildStatus, HealthStatus } from '../core/models.js';
import { ArchitectureDigest } from '../core/ArchitectureDigest.js';
import { ModelExecutor } from '../core/ModelExecutor.js';
import { HexagramManager } from '../core/HexagramManager.js';
import { YaoState } from '../core/models.js';
import { existsSync, readdirSync, readFileSync as fsReadFileSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

const logger = pino({
    name: 'SelfHealingEngine',
    base: { hostname: 'POG-VIBE' }
});

export interface ExecutionStep {
    readonly tool: string;
    readonly args: string[];
    readonly reasoning: string;
}

export interface ExecutionPlan {
    readonly goal: string;
    readonly steps: ReadonlyArray<ExecutionStep>;
}

/**
 * SelfHealingEngine - Codifies ternary diagnostic logic for project errors.
 * 
 * -1 (CRITICAL): Stop and notify user
 * 0 (PATCH): Trigger correction handler (Ollama)
 * 1 (CONTINUE): Planned drift or valid state
 */
export class SelfHealingEngine {
    private readonly architectureDigest: ArchitectureDigest;

    constructor(
        projectRoot: string,
        private readonly executor: ModelExecutor,
        private readonly hexagramManager: HexagramManager,
        private readonly correctionModel: string = 'qwen2.5-coder:7b-instruct-q4_K_M'
    ) {
        this.architectureDigest = new ArchitectureDigest(projectRoot);
    }

    /**
     * Diagnose an error in context of the current execution plan.
     */
    async diagnose(error: TSCError, plan?: ExecutionPlan): Promise<{ decision: CognitiveChoice; reasoning: string }> {
        logger.info({ code: error.code, file: error.file }, 'Diagnosing error');

        // 0. Sense Test Outputs (Phase 16)
        const testInsights = this.senseTestOutputs();
        if (testInsights) {
            logger.info({ insights: testInsights.substring(0, 100) }, 'Sensed test insights');
        }

        // 1. Check for Planned Drift (Any Error)
        // If the file causing the error is part of the current plan, we assume the agent is fixing it.
        const isPlanned = this.isFilePlanned(error.file, plan) || this.isModulePlanned(error.message, plan);
        if (isPlanned) {
            await this.hexagramManager.pinCard(3, 'Planned Drift', `Acknowledged error in ${error.file} as part of active plan.`, YaoState.YoungYang);
            return {
                decision: BuildStatus.Passed,
                reasoning: `Planned Drift: File/Module related to [${error.file}] is referenced in future plan steps. Proceeding.`
            };
        }

        // 2. Perform AI-powered "Sense" check using Correction Handler (Ollama)
        const senseCheck = await this.performSenseCheck(error);

        // 3. Structural Compliance Check
        const manifesto = this.architectureDigest.getManifest();
        const domainFiles = Object.values(manifesto.domainModel);
        const isStructural = domainFiles.some(m => error.file.includes(m.file));

        if (isStructural && senseCheck.severity === 'critical') {
            await this.hexagramManager.pinCard(1, 'Structural Breach', `Critical fault in ${error.file}: ${senseCheck.analysis}`, YaoState.OldYin);
            return {
                decision: HealthStatus.Critical,
                reasoning: `Critical Structural Break: ${error.message} in core manifest file [${error.file}]. Escalation required.`
            };
        }

        await this.hexagramManager.pinCard(3, 'Neural Repair', `Healing ${error.file}: ${senseCheck.analysis}`, YaoState.OldYang);

        return {
            decision: BuildStatus.Warning,
            reasoning: `Correction Needed: ${senseCheck.analysis}. Triggering auto-patch turn via ${this.correctionModel}.`
        };
    }

    /**
     * Executes relevant test scripts to verify the integrity of a specific module.
     * Maps to the 'Biological Verification' phase of the heal loop.
     */
    public async verifyWithTests(projectRoot: string, testPattern?: string): Promise<{ ok: boolean; output: string }> {
        logger.info({ projectRoot, testPattern }, 'Initiating biological test verification');

        const timestamp = Date.now();
        const logFile = `tests/outputs/test_run_${timestamp}.log`;
        // Ensure directory exists
        const outputsDir = join(projectRoot, 'tests', 'outputs');
        if (!existsSync(outputsDir)) {
            try { await import('fs/promises').then(fs => fs.mkdir(outputsDir, { recursive: true })); } catch { }
        }

        // Redirect output to file
        const testCmd = testPattern
            ? `npm test -- ${testPattern} > ${logFile} 2>&1`
            : `npm test > ${logFile} 2>&1`;

        try {
            await execAsync(testCmd, {
                cwd: projectRoot,
                timeout: 120000 // 2 minute timeout for full suites
            });

            // Read the log file to return output
            const output = fsReadFileSync(join(projectRoot, logFile), 'utf-8');

            await this.hexagramManager.pinCard(2, 'Test Pulse', `Somatic verification passed for ${testPattern || 'all'}`, YaoState.YoungYang);
            return { ok: true, output };
        } catch (error: any) {
            // Read the log file even on failure if it exists
            let combined = '';
            try {
                combined = fsReadFileSync(join(projectRoot, logFile), 'utf-8');
            } catch {
                combined = (error.stdout || '') + (error.stderr || '') + (error.message || '');
            }

            await this.hexagramManager.pinCard(2, 'Test Pulse', `Somatic verification failed for ${testPattern || 'all'}`, YaoState.OldYin);
            return { ok: false, output: combined };
        }
    }

    private isFilePlanned(filePath: string, plan?: ExecutionPlan): boolean {
        if (!plan) return false;
        const parts = filePath.split(/[\\/]/);
        const fileName = parts.pop();
        const baseName = fileName?.split('.')[0];
        if (!baseName) return false;

        return plan.steps.some(step =>
            JSON.stringify(step.args).includes(baseName) ||
            step.reasoning.includes(baseName)
        );
    }

    private isModulePlanned(errorMessage: string, plan?: ExecutionPlan): boolean {
        if (!plan) return false;
        const match = errorMessage.match(/module '(.+?)'/);
        if (!match) return false;
        const moduleName = match[1] as string;

        return plan.steps.some(step =>
            JSON.stringify(step.args).includes(moduleName) ||
            step.reasoning.includes(moduleName)
        );
    }

    private godHeadContext: string = '';

    public setGodHeadContext(context: string): void {
        this.godHeadContext = context;
        logger.info('God Head Context assimilated into Self-Healing Engine.');
    }

    private async performSenseCheck(error: TSCError): Promise<{ severity: string; analysis: string }> {
        const prompt = `Analyze this TSC error as a designated correction handler.
God Head Context (pog.md):
${this.godHeadContext ? this.godHeadContext.slice(0, 500) : 'No specific context provided.'}

Error: ${error.file}:${error.line} - [${error.code}] ${error.message}

Task: Determine if this is a minor type fix or a major structural break.
Format: JSON { "severity": "low|medium|high|critical", "analysis": "concise explanation" }`;

        const result = await this.executor.callModel(this.correctionModel, prompt);
        if (!result.ok) {
            return { severity: 'medium', analysis: 'Correction handler unavailable, assuming medium severity.' };
        }

        try {
            const json = JSON.parse(result.value.response.match(/\{[\s\S]*\}/)?.[0] || '{}');
            return {
                severity: json.severity || 'medium',
                analysis: json.analysis || 'Generic type mismatch suspected.'
            };
        } catch {
            return { severity: 'medium', analysis: 'Failed to parse correction analysis.' };
        }
    }

    /**
     * Senses the tests/outputs directory for recent success/failure signals.
     */
    private senseTestOutputs(): string | undefined {
        const outputsDir = join(this.architectureDigest.getManifest().domainModel['Tests']?.file.split('/')[0] || 'tests', 'outputs');
        if (!existsSync(outputsDir)) return undefined;

        try {
            const files = readdirSync(outputsDir);
            const recentLogs = files.filter(f => f.endsWith('.log') || f.endsWith('.txt') || f.endsWith('.json')).slice(-5);

            return recentLogs.map(f => {
                const content = fsReadFileSync(join(outputsDir, f), 'utf-8').slice(-500);
                return `[${f}]: ${content}`;
            }).join('\n---\n');
        } catch (err) {
            logger.error({ err }, 'Failed to sense test outputs');
            return undefined;
        }
    }

    /**
     * Purges the tests/outputs directory.
     * Triggered after successful healing to clear stale diagnostic state.
     */
    public cleanupTestOutputs(): void {
        const outputsDir = join(this.architectureDigest.getManifest().domainModel['Tests']?.file.split('/')[0] || 'tests', 'outputs');
        if (!existsSync(outputsDir)) return;

        try {
            const files = readdirSync(outputsDir);
            for (const file of files) {
                const filePath = join(outputsDir, file);
                const stats = readdirSync(outputsDir, { withFileTypes: true }).find(f => f.name === file);
                if (stats?.isFile()) {
                    import('fs').then(fs => fs.unlinkSync(filePath));
                }
            }
            logger.info({ count: files.length }, 'Cleaned up test outputs');
        } catch (err) {
            logger.error({ err }, 'Failed to cleanup test outputs');
        }
    }

    /**
     * Heal With Process — Biological Verification Loop
     * 
     * After the AI generates a fix, this method runs a real typecheck
     * to verify the repair actually resolved the issue.
     * Pins results to Hexagram Line 1 (Foundation / Structural Roots).
     * 
     * YaoState mapping:
     *  - Pass:    YoungYang (⚊ Stable — Foundation solid)
     *  - Partial: OldYang   (◯ Moving — repair in progress)
     *  - Fail:    OldYin    (✕ Moving — structural break persists)
     */
    public async healWithProcess(projectRoot: string): Promise<{ healed: boolean; output: string; yaoState: YaoState }> {
        logger.info({ projectRoot }, 'Running biological verification (healWithProcess)');

        try {
            const { stdout, stderr } = await execAsync('npm run typecheck', {
                cwd: projectRoot,
                timeout: 30000
            });

            const combinedOutput = stdout + stderr;
            const hasWarnings = combinedOutput.includes('warning') || combinedOutput.includes('WARN');

            if (hasWarnings) {
                await this.hexagramManager.pinCard(1, 'Heal Partial',
                    `Typecheck passed with warnings after repair`, YaoState.OldYang);
                return { healed: true, output: combinedOutput, yaoState: YaoState.OldYang };
            }

            await this.hexagramManager.pinCard(1, 'Heal Verified',
                'Typecheck passed cleanly after repair. Triggering somatic test audit...', YaoState.YoungYang);

            // SOMATIC CROSS-CHECK: Run tests if typecheck passes
            const testResult = await this.verifyWithTests(projectRoot);
            if (!testResult.ok) {
                await this.hexagramManager.pinCard(1, 'Regression Detected',
                    'Types OK but somatic tests failed. Healing cycle continues.', YaoState.OldYin);
                return { healed: false, output: testResult.output, yaoState: YaoState.OldYin };
            }

            this.cleanupTestOutputs();
            return { healed: true, output: testResult.output, yaoState: YaoState.YoungYang };
        } catch (error: unknown) {
            const err = error as { stderr?: string; stdout?: string; message?: string };
            const errorOutput = (err.stderr || err.stdout || err.message || 'Unknown failure').substring(0, 500);

            await this.hexagramManager.pinCard(1, 'Heal Failed',
                `Verification failed: ${errorOutput.substring(0, 200)}`, YaoState.OldYin);

            logger.warn({ errorOutput: errorOutput.substring(0, 200) }, 'Biological verification failed');
            return { healed: false, output: errorOutput, yaoState: YaoState.OldYin };
        }
    }
}
