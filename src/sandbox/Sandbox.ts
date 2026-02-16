/**
 * Sandbox - Safe execution environment
 * 
 * Responsibilities:
 * - Execute generated commands safely
 * - Create snapshots before execution (using Git or File Copy)
 * - Manage rollbacks on failure
 * - Extract and validate commands from AI output
 */

import { join } from 'path';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import pino from 'pino';
import type { Result, VibeConfig } from '../core/models.js';
import { ShellSpine } from '../spines/cli/ShellSpine.js';

const execAsync = promisify(exec);

const logger = pino({
  name: 'Sandbox',
  base: { hostname: 'POG-VIBE' }
});

export interface ExecutionResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
}

export class Sandbox {
  private readonly snapshotsDir: string;
  private readonly shellSpine: ShellSpine;

  constructor(private readonly config: VibeConfig) {
    this.snapshotsDir = join(config.pogDir, 'snapshots');
    this.shellSpine = new ShellSpine(config);
    if (!existsSync(this.snapshotsDir)) {
      mkdirSync(this.snapshotsDir, { recursive: true });
    }
  }

  async execute(command: string): Promise<Result<ExecutionResult>> {
    try {
      logger.info({ command }, 'Executing command in sandbox');

      // 1. Create snapshot before execution
      const snapshotResult = await this.createSnapshot('Before: ' + command);
      if (!snapshotResult.ok) {
        const error = (snapshotResult as { ok: false; error: Error }).error;
        return { ok: false, error };
      }

      const snapshotId = snapshotResult.value;

      try {
        // 2. Run the command
        const result = await this.shellSpine.getTools().find(t => t.name === 'sh_exec')!.handler({ command });

        if (result.ok) {
          const val = result.value as { stdout: string; stderr: string; exitCode: number };
          if (val.exitCode === 0) {
            return { ok: true, value: val };
          } else {
            throw new Error(val.stderr || 'Command failed');
          }
        } else {
          throw (result as any).error || new Error('Shell execution failed');
        }
      } catch (error: any) {
        // 3. Rollback on failure
        logger.warn({ command, error: error.message }, 'Command failed, rolling back...');
        await this.rollback(snapshotId);

        return {
          ok: true, // Still returning ok: true because the sandbox handled the failure
          value: {
            stdout: '',
            stderr: error.message,
            exitCode: 1
          }
        };
      }
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  /**
   * Create a project snapshot
   * Uses git stash if in a git repo, otherwise copies files
   */
  async createSnapshot(reason: string): Promise<Result<string>> {
    try {
      const isGit = existsSync(join(this.config.projectRoot, '.git'));
      const snapshotId = `snap_${Date.now()}`;

      if (isGit) {
        try {
          const result = await this.shellSpine.getTools().find(t => t.name === 'sh_exec')!.handler({
            command: `git add . && git stash push -m "${snapshotId}: ${reason}"`
          });

          if (result.ok && (result.value as any).exitCode === 0) {
            logger.debug({ snapshotId, method: 'git' }, 'Snapshot created via git stash');
            return { ok: true, value: snapshotId };
          }
          logger.warn('Git stash failed, falling back to file copy');
        } catch (gitError) {
          logger.warn({ gitError }, 'Git stash error, falling back to file copy');
        }
      }

      // Fallback: File Copy (Limited to source files for performance)
      const dest = join(this.snapshotsDir, snapshotId);
      mkdirSync(dest, { recursive: true });

      // Copy key project areas
      ['src', 'cli', 'tests', 'package.json', 'tsconfig.json'].forEach(item => {
        const srcPath = join(this.config.projectRoot, item);
        if (existsSync(srcPath)) {
          try {
            cpSync(srcPath, join(dest, item), { recursive: true });
          } catch (err) {
            logger.error({ item, err }, 'Failed to copy item to snapshot');
          }
        }
      });

      logger.debug({ snapshotId, method: 'copy' }, 'Snapshot created via file copy');
      return { ok: true, value: snapshotId };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  /**
   * Rollback project to a specific snapshot
   */
  async rollback(snapshotId: string): Promise<Result<void>> {
    try {
      logger.info({ snapshotId }, 'Rolling back project');

      const isGit = existsSync(join(this.config.projectRoot, '.git'));

      if (isGit) {
        try {
          // Find stash index
          const result = await this.shellSpine.getTools().find(t => t.name === 'sh_exec')!.handler({ command: 'git stash list' });
          if (result.ok) {
            const stdout = (result.value as any).stdout;
            const lines = stdout.split('\n');
            const stashIndex = lines.findIndex((l: string) => l.includes(snapshotId));

            if (stashIndex !== -1) {
              await this.shellSpine.getTools().find(t => t.name === 'sh_exec')!.handler({
                command: `git reset --hard HEAD && git stash pop stash@{${stashIndex}}`
              });
              return { ok: true, value: undefined };
            }
          }
        } catch (gitError) {
          logger.warn({ gitError }, 'Git rollback failed');
        }
      }

      // File Copy Rollback
      const snapshotPath = join(this.snapshotsDir, snapshotId);
      if (existsSync(snapshotPath)) {
        ['src', 'cli', 'tests', 'package.json', 'tsconfig.json'].forEach(item => {
          const destPath = join(this.config.projectRoot, item);
          const srcPath = join(snapshotPath, item);
          if (existsSync(srcPath)) {
            try {
              rmSync(destPath, { recursive: true, force: true });
              cpSync(srcPath, destPath, { recursive: true });
            } catch (err) {
              logger.error({ item, err }, 'Failed to restore item during rollback');
            }
          }
        });
        return { ok: true, value: undefined };
      }

      return { ok: false, error: new Error(`Snapshot ${snapshotId} not found`) };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  /**
   * Verify Integrity — Biological Pulse Post-Execution Check
   * 
   * After sandbox execution, runs a real typecheck to confirm
   * the project structure is still healthy.
   * 
   * Mapped to Hexagram Line 2 (Biological Pulse / System Vitality):
   *  - Intact:   YoungYang (⚊ Stable vitality)
   *  - Degraded: OldYang   (◯ Moving — needs attention)
   *  - Broken:   YoungYin  (⚋ Receptive — rollback recommended)
   */
  async verifyIntegrity(): Promise<{ intact: boolean; errors: string[] }> {
    logger.info('Running post-execution integrity check');

    try {
      const { stdout, stderr } = await execAsync('npm run typecheck', {
        cwd: this.config.projectRoot,
        timeout: 30000
      });

      const combinedOutput = stdout + stderr;
      const hasWarnings = combinedOutput.includes('warning') || combinedOutput.includes('WARN');

      if (hasWarnings) {
        const warningLines = combinedOutput.split('\n')
          .filter((l: string) => l.toLowerCase().includes('warn')).slice(0, 5);
        logger.info({ warningCount: warningLines.length }, 'Integrity check passed with warnings');
        return { intact: true, errors: warningLines };
      }

      logger.info('Integrity check passed cleanly');
      return { intact: true, errors: [] };
    } catch (error: unknown) {
      const err = error as { stderr?: string; stdout?: string; message?: string };
      const output = err.stderr || err.stdout || err.message || '';
      const errorLines = output.split('\n')
        .filter((l: string) => l.includes('error TS')).slice(0, 10);

      logger.warn({ errorCount: errorLines.length }, 'Integrity check failed');
      return { intact: false, errors: errorLines };
    }
  }

  extractCommands(text: string): string[] {
    const commands: string[] = [];
    // Only extract blocks explicitly marked as shell/bash/sh/powershell/cmd
    // If no language is specified, we check if it looks like a command.
    const codeBlockRegex = /```(bash|sh|shell|powershell|ps1|batch|cmd|)\n([\s\S]*?)```/gi;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const lang = (match[1] || '').toLowerCase();
      const block = match[2]?.trim();

      if (!block) continue;

      // If language specified and NOT a shell type, ignore it
      const shellLangs = ['bash', 'sh', 'shell', 'powershell', 'ps1', 'batch', 'cmd', ''];
      if (lang && !shellLangs.includes(lang)) {
        continue;
      }

      // If no language, and it contains common programming keywords, ignore it (likely a code snippet)
      if (!lang && /\b(function|class|export|import|const|let|interface|types|from)\b/.test(block)) {
        continue;
      }

      const lines = block.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
      commands.push(...lines);
    }

    return commands;
  }
}
