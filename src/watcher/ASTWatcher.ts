/**
 * AST Watcher - File system monitoring with structural change detection
 * 
 * Responsibilities:
 * - Monitor project files for changes
 * - Hash file contents to detect real changes
 * - Parse changed files (placeholder for tree-sitter)
 * - Emit events for Orchestrator
 */

import { EventEmitter } from 'events';
import chokidar from 'chokidar';
import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import pino from 'pino';
import type { Result, VibeConfig } from '../core/models.js';

const logger = pino({
  name: 'ASTWatcher',
  base: { hostname: 'POG-VIBE' }
});

export interface WatcherEvents {
  fileChanged: (data: { filePath: string; hasStructuralChange: boolean }) => void;
  watchError: (data: { error: Error }) => void;
}

export class ASTWatcher extends EventEmitter {
  private watcher?: chokidar.FSWatcher;
  private readonly fileHashes: Map<string, string> = new Map();

  constructor(private readonly config: VibeConfig) {
    super();
  }

  override on<K extends keyof WatcherEvents>(
    event: K,
    listener: WatcherEvents[K]
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof WatcherEvents>(
    event: K,
    ...args: Parameters<WatcherEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  initialize(): Result<void> {
    try {
      logger.info({ projectRoot: this.config.projectRoot }, 'Initializing AST Watcher');

      this.watcher = chokidar.watch(this.config.projectRoot, {
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
          '**/.pog-coder-vibe/**',
          this.config.pogDir
        ],
        persistent: true,
        ignoreInitial: false // Process initial files to build hash map
      });

      this.setupHandlers();

      return { ok: true, value: undefined };
    } catch (error) {
      logger.error({ error }, 'Failed to initialize watcher');
      return { ok: false, error: error as Error };
    }
  }

  private setupHandlers(): void {
    if (!this.watcher) return;

    this.watcher
      .on('add', (filePath: string) => this.handleFileChange(filePath, false))
      .on('change', (filePath: string) => this.handleFileChange(filePath, true))
      .on('error', (error: Error) => {
        logger.error({ error }, 'Watcher error');
        this.emit('watchError', { error });
      });
  }

  private handleFileChange(filePath: string, isUpdate: boolean): void {
    try {
      if (!existsSync(filePath)) return;

      const content = readFileSync(filePath, 'utf-8');
      const hash = createHash('md5').update(content).digest('hex');
      const previousHash = this.fileHashes.get(filePath);

      if (hash === previousHash) {
        // No real change (e.g. metadata update only)
        return;
      }

      this.fileHashes.set(filePath, hash);

      if (isUpdate) {
        logger.debug({ filePath }, 'Structural change detected');
        this.emit('fileChanged', { filePath, hasStructuralChange: true });
      }
    } catch (error) {
      logger.warn({ error, filePath }, 'Failed to process file change');
    }
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }
    this.removeAllListeners();
    logger.info('Watcher stopped');
  }
}