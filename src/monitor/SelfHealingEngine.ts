import pino from 'pino';
import { TSCError } from './TSCMonitor.js';
import { Ternary } from '../core/models.js';
import { ArchitectureDigest } from '../core/ArchitectureDigest.js';
import { ModelExecutor } from '../core/ModelExecutor.js';

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
        private readonly correctionModel: string = 'qwen2.5-coder:7b-instruct-q4_K_M'
    ) {
        this.architectureDigest = new ArchitectureDigest(projectRoot);
    }

    /**
     * Diagnose an error in context of the current execution plan.
     */
    async diagnose(error: TSCError, plan?: ExecutionPlan): Promise<{ decision: Ternary; reasoning: string }> {
        logger.info({ code: error.code, file: error.file }, 'Diagnosing error');

        // 1. Check for Planned Drift (Missing File/Module)
        if (error.code === 'TS2307' || error.message.includes('Cannot find module')) {
            const isPlanned = this.isFilePlanned(error.file, plan) || this.isModulePlanned(error.message, plan);
            if (isPlanned) {
                return {
                    decision: 1,
                    reasoning: `Planned Drift: File/Module related to [${error.file}] is referenced in future plan steps. Proceeding.`
                };
            }
        }

        // 2. Perform AI-powered "Sense" check using Correction Handler (Ollama)
        const senseCheck = await this.performSenseCheck(error);

        // 3. Structural Compliance Check
        const manifesto = this.architectureDigest.getManifest();
        const domainFiles = Object.values(manifesto.domainModel);
        const isStructural = domainFiles.some(m => error.file.includes(m.file));

        if (isStructural && senseCheck.severity === 'critical') {
            return {
                decision: -1,
                reasoning: `Critical Structural Break: ${error.message} in core manifest file [${error.file}]. Escalation required.`
            };
        }

        return {
            decision: 0,
            reasoning: `Correction Needed: ${senseCheck.analysis}. Triggering auto-patch turn via ${this.correctionModel}.`
        };
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

    private async performSenseCheck(error: TSCError): Promise<{ severity: string; analysis: string }> {
        const prompt = `Analyze this TSC error as a designated correction handler.
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
}
