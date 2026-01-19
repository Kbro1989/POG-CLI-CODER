/**
 * Configuration management with environment variable support and validation
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { z } from 'zod';
import type { VibeConfig } from '../core/models.js';

const ConfigSchema = z.object({
  pogDir: z.string().min(1),
  projectRoot: z.string().min(1),
  agentName: z.string().min(1).default('POG-VIBE-AGENT'),
  wsPort: z.number().int().min(1024).max(65535).default(8765),
  maxSnapshotAge: z.number().int().positive().default(86400000), // 24 hours
  circuitBreakerThreshold: z.number().int().positive().default(3),
  circuitBreakerCooldown: z.number().int().positive().default(30000), // 30 seconds
  embeddingDimensions: z.number().int().positive().default(768),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
  projectId: z.string().min(1),
  errorTrackerModelPath: z.string().optional(),
  enabledServices: z.array(z.string()).default(['gemini', 'ollama', 'mcp_gitkraken', 'healthcare', 'documentai', 'vision', 'mediaforge'])
});

type ConfigInput = z.input<typeof ConfigSchema>;

const DEFAULT_POG_DIR = join(homedir(), '.pog-coder-vibe');
const CONFIG_FILE_NAME = 'config.json';

export class ConfigManager {
  private config: VibeConfig;
  private readonly configPath: string;

  constructor(projectRoot: string, overrides?: Partial<ConfigInput>) {
    // Check for local .pog directory preference
    const localPogDir = join(projectRoot, '.pog');
    const useLocal = process.env['POG_USE_LOCAL'] === 'true' || existsSync(localPogDir);

    const resolvedDefault = useLocal ? localPogDir : DEFAULT_POG_DIR;
    const pogDir = process.env['POG_DIR'] ?? overrides?.pogDir ?? resolvedDefault;

    this.configPath = join(pogDir, CONFIG_FILE_NAME);

    // Ensure POG directory exists
    if (!existsSync(pogDir)) {
      mkdirSync(pogDir, { recursive: true });
    }

    // Load or create config
    this.config = this.loadConfig(projectRoot, pogDir, overrides);
  }

  private loadConfig(
    projectRoot: string,
    pogDir: string,
    overrides?: Partial<ConfigInput>
  ): VibeConfig {
    let fileConfig: Partial<ConfigInput> = {};

    // Try to load existing config
    if (existsSync(this.configPath)) {
      try {
        const raw = readFileSync(this.configPath, 'utf-8');
        fileConfig = JSON.parse(raw) as Partial<ConfigInput>;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to parse config file, using defaults:', error);
      }
    }

    // Merge: defaults < file < env vars < overrides
    const merged: ConfigInput = {
      pogDir,
      projectRoot,
      agentName: process.env['VIBE_AGENT_NAME'] || overrides?.agentName || fileConfig.agentName || 'POG-VIBE-AGENT',
      wsPort: Number(process.env['VIBE_WS_PORT']) || overrides?.wsPort || fileConfig.wsPort || 8765,
      maxSnapshotAge: Number(process.env['VIBE_MAX_SNAPSHOT_AGE']) || overrides?.maxSnapshotAge || fileConfig.maxSnapshotAge || 86400000,
      circuitBreakerThreshold: Number(process.env['VIBE_CB_THRESHOLD']) || overrides?.circuitBreakerThreshold || fileConfig.circuitBreakerThreshold || 3,
      circuitBreakerCooldown: Number(process.env['VIBE_CB_COOLDOWN']) || overrides?.circuitBreakerCooldown || fileConfig.circuitBreakerCooldown || 30000,
      embeddingDimensions: Number(process.env['VIBE_EMBEDDING_DIM']) || overrides?.embeddingDimensions || fileConfig.embeddingDimensions || 768,
      logLevel: (process.env['VIBE_LOG_LEVEL'] as VibeConfig['logLevel']) || overrides?.logLevel || fileConfig.logLevel || 'info',
      projectId: process.env['POG_PROJECT_ID'] || overrides?.projectId || fileConfig.projectId || projectRoot.split(/[\\/]/).pop() || 'default-project',
      errorTrackerModelPath: process.env['POG_ERROR_TRACKER_PATH'] || overrides?.errorTrackerModelPath || fileConfig.errorTrackerModelPath || '',
      enabledServices: overrides?.enabledServices || fileConfig.enabledServices || ['gemini', 'ollama', 'mcp_gitkraken', 'healthcare', 'documentai', 'vision']
    } as any; // Cast for now to satisfy strict Zod vs Interface drift

    // Validate
    const result = ConfigSchema.safeParse(merged);

    if (!result.success) {
      throw new Error(`Invalid configuration: ${result.error.message}`);
    }

    // Save validated config back to file
    this.saveConfig(result.data);

    return result.data;
  }

  private saveConfig(config: VibeConfig): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save config file:', error);
    }
  }

  getConfig(): Readonly<VibeConfig> {
    return this.config;
  }

  updateConfig(updates: Partial<ConfigInput>): void {
    const merged = { ...this.config, ...updates };
    const result = ConfigSchema.safeParse(merged);

    if (!result.success) {
      throw new Error(`Invalid config update: ${result.error.message}`);
    }

    this.config = result.data;
    this.saveConfig(this.config);
  }
}

/**
 * Environment variable documentation
 */
export const ENV_VARS = {
  POG_DIR: 'Base directory for POG data (default: ~/.pog-coder-vibe)',
  VIBE_WS_PORT: 'WebSocket port for VS Code extension (default: 8765)',
  VIBE_MAX_SNAPSHOT_AGE: 'Maximum snapshot age in ms (default: 86400000)',
  VIBE_CB_THRESHOLD: 'Circuit breaker failure threshold (default: 3)',
  VIBE_CB_COOLDOWN: 'Circuit breaker cooldown in ms (default: 30000)',
  VIBE_EMBEDDING_DIM: 'Vector embedding dimensions (default: 768)',
  VIBE_LOG_LEVEL: 'Logging level: trace|debug|info|warn|error (default: info)',
  VIBE_AGENT_NAME: 'Display name for the AI agent (default: POG-VIBE-AGENT)',
  SESSION_ID: 'Current session identifier (auto-generated if not set)'
} as const;
