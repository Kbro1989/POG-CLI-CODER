/**
 * Configuration management with environment variable support and validation
 */

import { homedir } from 'os';
import { join, dirname } from 'path';
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
  environment: z.enum(['offline', 'online', 'local', 'unknown']).default('local'),
  projectId: z.string().default('pog-vibe-session'),
  workspaces: z.array(z.string()).default([]),
  errorTrackerModelPath: z.string().optional(),
  ollamaModelsPath: z.string().optional(),
  gutenbergPath: z.string().optional(),
  enabledServices: z.array(z.string()).default(['gemini', 'ollama', 'cloudflare', 'mcp_gitkraken', 'healthcare', 'documentai', 'vision', 'mediaforge', 'gutenberg', 'dashboard']),
  cloudflareGatewayUrl: z.string().url().optional(),
  monitorModel: z.string().optional(),
  snapshotModel: z.string().optional(),
  criticModel: z.string().optional(),
  planningModel: z.string().optional(),
  codingModel: z.string().optional(),
  proCoderModel: z.string().optional(),
  thinkingAdminModel: z.string().optional(),
  allowExplorableCloud: z.boolean().default(true),
  cloudHealingEnabled: z.boolean().default(true),
  healThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  sovereignRoot: z.string().optional(),
  pogApiUrl: z.string().url().optional(),
  aiContextPath: z.string().optional(),
  rootStack: z.array(z.string()).default([]),
  identity: z.object({
    email: z.string(),
    name: z.string(),
    source: z.enum(['env', 'gcloud', 'discovery'])
  }).optional(),
  activeStyle: z.object({
    readabilityScore: z.number(),
    avgSentenceLength: z.number(),
    uniqueWordRatio: z.number(),
    tone: z.enum(['simple', 'complex', 'academic', 'unknown']),
    author: z.string().optional(),
    title: z.string().optional()
  }).optional()
});

type ConfigInput = z.input<typeof ConfigSchema>;

const DEFAULT_POG_DIR = join(homedir(), '.pog-coder-vibe');
const CONFIG_FILE_NAME = 'config.json';

export class ConfigManager {
  private config: VibeConfig;
  private readonly configPath: string;

  constructor(projectRoot: string, overrides?: Partial<ConfigInput>) {
    // 0. Initialize Config Paths & Load File Config
    const pogDir = process.env['POG_DIR'] || overrides?.pogDir || DEFAULT_POG_DIR;
    this.configPath = join(pogDir, CONFIG_FILE_NAME);  // Moved assignment up
    const configPath = this.configPath;
    let fileConfig: Partial<VibeConfig> = {};
    try {
      if (existsSync(configPath)) {
        fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
      }
    } catch (e) { /* ignore */ }

    // 1. Detect Sovereign Root (High Priority D: Drive)
    const SOVEREIGN_CANDIDATE = 'D:\\pog-coder-vibe';
    const hasSovereign = existsSync(SOVEREIGN_CANDIDATE);

    // 3. Identity Resolution (God State)
    const identityEmail = process.env['CLOUDFLARE_AUTH_EMAIL'] || process.env['VIBE_USER_EMAIL'];
    const identitySource = identityEmail ? 'env' : 'discovery';

    // 4. Resolve rootStack (Federated Context)
    const sovereignRoot = hasSovereign ? (process.env['POG_SOVEREIGN_ROOT'] || SOVEREIGN_CANDIDATE) : undefined;

    const rootStack = [
      projectRoot, // God State / Core Identity
    ];

    if (sovereignRoot) rootStack.push(sovereignRoot);
    if (process.cwd() !== projectRoot) rootStack.push(process.cwd());

    // 5. Establish aiContextPath (Shell Context)
    const aiContextPath = process.env['POG_AI_CONTEXT_PATH'] || overrides?.aiContextPath || join(projectRoot, 'docs', 'ai-context');

    // Load or create config
    const merged: ConfigInput = {
      pogDir,
      projectRoot,
      rootStack,
      aiContextPath,
      agentName: process.env['VIBE_AGENT_NAME'] || overrides?.agentName || fileConfig.agentName || 'POG-VIBE-AGENT',
      wsPort: Number(process.env['VIBE_WS_PORT']) || overrides?.wsPort || fileConfig.wsPort || 8765,
      maxSnapshotAge: Number(process.env['VIBE_MAX_SNAPSHOT_AGE']) || overrides?.maxSnapshotAge || fileConfig.maxSnapshotAge || 86400000,
      circuitBreakerThreshold: Number(process.env['VIBE_CB_THRESHOLD']) || overrides?.circuitBreakerThreshold || fileConfig.circuitBreakerThreshold || 3,
      circuitBreakerCooldown: Number(process.env['VIBE_CB_COOLDOWN']) || overrides?.circuitBreakerCooldown || fileConfig.circuitBreakerCooldown || 30000,
      embeddingDimensions: Number(process.env['VIBE_EMBEDDING_DIM']) || overrides?.embeddingDimensions || fileConfig.embeddingDimensions || 768,
      environment: (process.env['VIBE_ENVIRONMENT'] as VibeConfig['environment']) || overrides?.environment || fileConfig.environment || (hasSovereign ? 'offline' : 'local'),
      logLevel: (process.env['VIBE_LOG_LEVEL'] as VibeConfig['logLevel']) || overrides?.logLevel || fileConfig.logLevel || 'info',
      projectId: process.env['POG_PROJECT_ID'] || overrides?.projectId || fileConfig.projectId || projectRoot.split(/[\\/]/).pop() || 'default-project',
      ollamaModelsPath: process.env['OLLAMA_MODELS_PATH'] || overrides?.ollamaModelsPath || fileConfig.ollamaModelsPath || '',
      gutenbergPath: (() => {
        const raw = process.env['POG_GUTENBERG_PATH'] || overrides?.gutenbergPath || fileConfig.gutenbergPath || '';
        if (raw && !/^[a-zA-Z]:/.test(raw) && !raw.startsWith('/') && !raw.startsWith('\\')) {
          return join(pogDir, raw);
        }
        return raw;
      })(),
      enabledServices: overrides?.enabledServices || ['gemini', 'ollama', 'cloudflare', 'mcp_gitkraken', 'healthcare', 'documentai', 'vision', 'mediaforge', 'gutenberg', 'dashboard'],
      cloudflareGatewayUrl: process.env['CLOUDFLARE_GATEWAY_URL'] || overrides?.cloudflareGatewayUrl,
      proCoderModel: process.env['VIBE_PRO_CODER_MODEL'] || overrides?.proCoderModel || fileConfig.proCoderModel,
      thinkingAdminModel: process.env['VIBE_THINKING_ADMIN_MODEL'] || overrides?.thinkingAdminModel || fileConfig.thinkingAdminModel,
      allowExplorableCloud: process.env['VIBE_ALLOW_EXPLORABLE_CLOUD'] !== 'false',
      cloudHealingEnabled: process.env['VIBE_CLOUD_HEALING_ENABLED'] !== 'false',
      sovereignRoot,
      pogApiUrl: process.env['POG_API_URL'] || overrides?.pogApiUrl || fileConfig.pogApiUrl,
      identity: identityEmail ? {
        email: identityEmail,
        name: identityEmail.split('@')[0],
        source: identitySource
      } as any : undefined
    };

    // Validate and save
    const result = ConfigSchema.safeParse(merged);
    if (!result.success) {
      // Fallback or detailed error
      this.config = merged as any;
      return;
    }

    this.config = result.data as VibeConfig;
    this.saveConfig(this.config);
  }

  private saveConfig(config: VibeConfig): void {
    try {
      if (!existsSync(dirname(this.configPath))) {
        mkdirSync(dirname(this.configPath), { recursive: true });
      }
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

    this.config = result.data as VibeConfig;
    this.saveConfig(this.config);
  }
}


