/**
 * Sandbox - Safe execution environment
 * 
 * Responsibilities:
 * - Execute generated commands safely
 * - Create snapshots before execution (using Git or File Copy)
 * - Manage rollbacks on failure
 * - Extract and validate commands from AI output
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import pino from 'pino';
import type { Result, VibeConfig } from '../core/models.js';

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

  constructor(private readonly config: VibeConfig) {
    this.snapshotsDir = join(config.pogDir, 'snapshots');
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
        return { ok: false, error: snapshotResult.error };
      }

      const snapshotId = snapshotResult.value;

      try {
        // 2. Run the command
        const { stdout, stderr } = await execAsync(command, {
          cwd: this.config.projectRoot,
          timeout: 60000 // 60s timeout
        });

        return {
          ok: true,
          value: { stdout, stderr, exitCode: 0 }
        };
      } catch (error: any) {
        // 3. Rollback on failure
        logger.warn({ command, error: error.message }, 'Command failed, rolling back...');
        await this.rollback(snapshotId);

        return {
          ok: true, // Still returning ok: true because the sandbox handled the failure
          value: {
            stdout: error.stdout || '',
            stderr: error.stderr || (error as Error).message,
            exitCode: error.code || 1
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
          await execAsync(`git add . && git stash push -m "${snapshotId}: ${reason}"`, {
            cwd: this.config.projectRoot
          });
          logger.debug({ snapshotId, method: 'git' }, 'Snapshot created via git stash');
          return { ok: true, value: snapshotId };
        } catch (gitError) {
          logger.warn({ gitError }, 'Git stash failed, falling back to file copy');
        }
      }

      // Fallback: File Copy (Limited to source files for performance)
      const dest = join(this.snapshotsDir, snapshotId);
      mkdirSync(dest, { recursive: true });

      // Copy src and cli directories
      ['src', 'cli', 'package.json', 'tsconfig.json'].forEach(item => {
        const srcPath = join(this.config.projectRoot, item);
        if (existsSync(srcPath)) {
          cpSync(srcPath, join(dest, item), { recursive: true });
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
          const { stdout } = await execAsync('git stash list', { cwd: this.config.projectRoot });
          const lines = stdout.split('\n');
          const stashIndex = lines.findIndex(l => l.includes(snapshotId));

          if (stashIndex !== -1) {
            await execAsync(`git reset --hard HEAD && git stash pop stash@{${stashIndex}}`, {
              cwd: this.config.projectRoot
            });
            return { ok: true, value: undefined };
          }
        } catch (gitError) {
          logger.warn({ gitError }, 'Git rollback failed');
        }
      }

      // File Copy Rollback
      const snapshotPath = join(this.snapshotsDir, snapshotId);
      if (existsSync(snapshotPath)) {
        ['src', 'cli', 'package.json', 'tsconfig.json'].forEach(item => {
          const destPath = join(this.config.projectRoot, item);
          const srcPath = join(snapshotPath, item);
          if (existsSync(srcPath)) {
            rmSync(destPath, { recursive: true, force: true });
            cpSync(srcPath, destPath, { recursive: true });
          }
        });
        return { ok: true, value: undefined };
      }

      return { ok: false, error: new Error(`Snapshot ${snapshotId} not found`) };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  extractCommands(text: string): string[] {
    const commands: string[] = [];
    // More robust regex for various shell types
    const codeBlockRegex = /```(?:bash|sh|shell|powershell|ps1|batch|cmd)?\n([\s\S]*?)```/gi;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const block = match[1]?.trim();
      if (block) {
        const lines = block.split('\n')
          .map(l => l.trim())
          .filter(l => l && !l.startsWith('#') && !l.startsWith('//'));
        commands.push(...lines);
      }
    }

    return commands;
  }
}