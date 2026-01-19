/**
 * TestRunner - Execute tests and typecheck after code edits
 * Detects errors and reports to supervisor for re-planning
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';

const execAsync = promisify(exec);
const logger = pino({
    name: 'TestRunner',
    base: { hostname: 'POG-VIBE' }
});

export interface TestResult {
    passed: boolean;
    output: string;
    errors?: string[];
    duration?: number;
}

export class TestRunner {
    private projectRoot: string;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
    }

    /**
     * Run npm test
     */
    async runTests(): Promise<TestResult> {
        logger.info('Running tests...');
        const startTime = Date.now();

        try {
            const { stdout, stderr } = await execAsync('npm test', {
                cwd: this.projectRoot,
                timeout: 60000, // 1 minute max
                env: { ...process.env, CI: 'true' } // Suppress interactive prompts
            });

            const duration = Date.now() - startTime;

            return {
                passed: true,
                output: stdout + stderr,
                duration
            };
        } catch (error: any) {
            const errorOutput = (error.stdout || '') + (error.stderr || '');
            const errors = this.parseTestErrors(errorOutput);
            const duration = Date.now() - startTime;

            return {
                passed: false,
                output: errorOutput,
                errors,
                duration
            };
        }
    }

    /**
     * Run TypeScript type checking
     */
    async runTypeCheck(): Promise<TestResult> {
        logger.info('Running typecheck...');
        const startTime = Date.now();

        try {
            const { stdout, stderr } = await execAsync('npm run typecheck', {
                cwd: this.projectRoot,
                timeout: 30000 // 30 seconds max
            });

            const duration = Date.now() - startTime;

            return {
                passed: true,
                output: stdout + stderr,
                duration
            };
        } catch (error: any) {
            const errorOutput = (error.stdout || '') + (error.stderr || '');
            const errors = this.parseTsErrors(errorOutput);
            const duration = Date.now() - startTime;

            logger.warn({ errorCount: errors.length }, 'TypeScript errors detected');

            return {
                passed: false,
                output: errorOutput,
                errors,
                duration
            };
        }
    }

    /**
     * Run both tests and typecheck
     */
    async runAll(): Promise<{ tests: TestResult; typecheck: TestResult }> {
        const [tests, typecheck] = await Promise.all([
            this.runTests().catch(e => ({
                passed: false,
                output: e.message,
                errors: [e.message]
            })),
            this.runTypeCheck()
        ]);

        return { tests, typecheck };
    }

    /**
     * Parse test errors from output
     */
    private parseTestErrors(output: string): string[] {
        const errors: string[] = [];

        // Jest/Vitest patterns
        const jestFailRegex = /FAIL\s+.*?\.test\.(ts|js|tsx|jsx)/g;
        const vitestFailRegex = /❯.*?FAIL/g;

        // Extract failing test files
        const jestMatches = output.match(jestFailRegex) || [];
        const vitestMatches = output.match(vitestFailRegex) || [];

        errors.push(...jestMatches, ...vitestMatches);

        // Also look for error messages
        const errorLines = output.split('\n').filter(line =>
            line.includes('Error:') || line.includes(' ✖ ') || line.includes(' ✗ ')
        );

        errors.push(...errorLines);

        return errors.slice(0, 10); // Limit to first 10 errors
    }

    /**
     * Parse TypeScript errors from output
     */
    private parseTsErrors(output: string): string[] {
        const errors: string[] = [];

        // TypeScript error pattern: "file.ts(line,col): error TS1234: message"
        const tsErrorRegex = /(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)/g;

        let match;
        while ((match = tsErrorRegex.exec(output)) !== null) {
            const [, file, line, col, code, message] = match;
            errors.push(`${file}:${line}:${col} - ${code}: ${message}`);
        }

        // Fallback: simple "error TS" pattern
        if (errors.length === 0) {
            const simpleRegex = /error TS\d+:.+/g;
            const matches = output.match(simpleRegex) || [];
            errors.push(...matches);
        }

        return errors.slice(0, 20); // Limit to first 20 errors
    }

    /**
     * Check if package.json has test script
     */
    hasTestScript(): boolean {
        try {
            const packageJson = require(`${this.projectRoot}/package.json`);
            return !!packageJson.scripts?.test;
        } catch {
            return false;
        }
    }

    /**
     * Check if package.json has typecheck script
     */
    hasTypecheckScript(): boolean {
        try {
            const packageJson = require(`${this.projectRoot}/package.json`);
            return !!packageJson.scripts?.typecheck;
        } catch {
            return false;
        }
    }
}
