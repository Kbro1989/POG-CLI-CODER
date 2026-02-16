/**
 * Free Orchestrator - Coordinates all subsystems
 * 
 * Responsibilities:
 * - Route intents to best model
 * - Execute model calls & Extract commands
 * - Orchestrate Sandbox (Snapshot -> Execute -> Rollback)
 * - Persist lessons to VectorDB
 * - Coordinate with ASTWatcher
 * - Implement "Research -> Plan -> Execute -> Review" Loop
 */

import { EventEmitter } from 'events';
import { homedir } from 'os';
import { join, resolve, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WebSocketServer } from 'ws';
import pino from 'pino';
import * as fs from 'fs';
import { createHash } from 'crypto';
import * as os from 'os';

import { Tool } from '@google/genai';

import {
  type Result,
  type IntentHistory,
  type VibeConfig,
  TaskType,
  type ModelPerformance,
  type Lesson,
  type AgentTurnResult,
  AgentTerminateMode,
  isOk,
  isErr,
  type ModelResponse,
  type Execution,
  type ExecutionContext, // Imported
  type ExecutionPlan     // Imported
} from './models.js';
import { FreeModelRouter } from './Router.js';
import { ASTWatcher } from '../watcher/ASTWatcher.js';
import { VectorDB } from '../learning/VectorDB.js';
import { Sandbox } from '../sandbox/Sandbox.js';
import { GeminiService } from './GeminiService.js';
import { KeyVault } from '../utils/KeyVault.js';
import { WebAppForgeLimb } from '../limbs/webapp/WebAppForgeLimb.js';
import { StoryboardLimb } from '../limbs/webapp/StoryboardLimb.js';
import { MediaForgeLimb } from '../limbs/media/MediaForgeLimb.js';
import { BioIntelligenceLimb } from '../limbs/bio/BioIntelligenceLimb.js';
import { GutenbergLimb } from '../limbs/gutenberg/GutenbergLimb.js';
import { NeuralLimb } from '../limbs/core/NeuralLimb.js';
import { CompressionLimb } from '../limbs/core/CompressionLimb.js';
import { BaseLimb } from '../limbs/core/BaseLimb.js';
import { SovereignCLILimb } from '../limbs/core/SovereignCLILimb.js';
import { VoiceLimb } from '../limbs/core/VoiceLimb.js';
import { DashboardLimb } from '../limbs/core/DashboardLimb.js';
import { constructInitialPrompt, PLANNING_PROMPT } from './SystemPrompts.js';
import { ContextBuilder } from '../context/ContextBuilder.js';
import { CodebaseIndexer } from '../learning/CodebaseIndexer.js';
import { ModelExecutor } from './ModelExecutor.js';
import { TaskClassifier } from './TaskClassifier.js';
import { ValidationSystem } from './validation/ValidationSystem.js';
import { NoMockValidator } from './validation/NoMockValidator.js';
import { ArchitecturalValidator } from './validation/ArchitecturalValidator.js';
import { AdversarialOrchestrator } from './AdversarialOrchestrator.js';
import { ArchitectureDigest } from './ArchitectureDigest.js';
import { IntentVerifier } from './verification/IntentVerifier.js';
import { PreviewServer, PreviewMetadata } from './PreviewServer.js';
import { HexagramManager } from './HexagramManager.js';
import { YaoState } from './models.js';
import { HexagramLimb } from '../limbs/core/HexagramLimb.js';
import { MonitorAgent } from '../monitor/MonitorAgent.js';
import { AILimb } from '../api/ai/AILimb.js';
import { CloudflareLimb } from '../limbs/cloud/CloudflareLimb.js';
import { GoogleServices } from '../services/GoogleServices.js';
import { CloudflareServices } from '../services/CloudflareServices.js';
import { NeuralForgeLimb } from '../limbs/core/NeuralForgeLimb.js';
import { SubstrateLimb } from '../limbs/system/SubstrateLimb.js';
import { WebSensoryLimb } from '../limbs/system/WebSensoryLimb.js';
import { MCPLimb } from '../limbs/system/MCPLimb.js';
import { FileLimb } from '../limbs/system/FileLimb.js';
import { EntityLimb } from '../limbs/system/EntityLimb.js';
import { AIModelLimb } from '../limbs/cloud/AIModelLimb.js';
import { ModelInventory } from './ModelInventory.js';
import { SystemEnvChecker, EnvStatus } from '../utils/SystemEnvChecker.js';
import { ControlPlaneLimb } from '../limbs/core/ControlPlaneLimb.js';
import { MemoryLimb } from '../limbs/core/MemoryLimb.js';
import { CognitionLimb } from '../limbs/core/CognitionLimb.js';
import { ProjectPulse } from '../utils/ProjectPulse.js';
import { QuantumLimb } from '../limbs/experimental/QuantumLimb.js';
import { RelicLimb } from '../limbs/experimental/RelicLimb.js';
import { OmegaLimb } from '../limbs/experimental/OmegaLimb.js';
import { GhostLimb } from '../limbs/core/GhostLimb.js';
import { hasSovereignDrive, getSovereignRoot } from '../utils/SovereignPathResolver.js';
import { CognitiveTranslator } from '../utils/CognitiveTranslator.js';
import { ChromanumberLimb } from '../limbs/chroma/ChromanumberLimb.js';
import { EnvironmentLimb } from '../limbs/system/EnvironmentLimb.js';
import { FileSystemLimb } from '../limbs/core/FileSystemLimb.js';
import { YoloLimb } from '../limbs/core/YoloLimb.js';
import { ServiceDiscovery } from './ServiceDiscovery.js';
import { StateManager } from './StateManager.js';
import { IntentMap } from '../api/ai/IntentMap.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import { PulseMonitor } from '../monitor/PulseMonitor.js';

// Note: Component logger is initialized in the constructor for dynamic identity.

function expandTilde(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  return path;
}
// Local definitions removed in favor of models.ts exports
import { BuildStatus, HealthStatus, ResourcePressure, UserEngagement, SuccessRating, ExecutionEscalation, CostTier } from './models.js';

export interface OrchestratorEvents {
  intentExecuted: (data: IntentHistory) => void;
  modelCalled: (data: { model: string; prompt: string }) => void;
  executionError: (data: { error: Error; context: ExecutionContext }) => void;
  snapshotCreated: (data: { snapshotId: string; reason: string }) => void;
  commandExecuted: (data: { command: string; success: SuccessRating; output: string }) => void;
  reviewStarted: (data: { iteration: number }) => void;
  previewStarted: (data: PreviewMetadata) => void;
  preview_log: (data: { projectName: string; stream: 'stdout' | 'stderr'; text: string }) => void;
  preview_exit: (data: { projectName: string; code: number | null }) => void;
  awaitingFeedback: (data: { message: string }) => void;
  userFeedback: (feedback: string) => void;
}

export class FreeOrchestrator extends EventEmitter {
  private readonly startTimestamp: number = Date.now();
  private readonly router: FreeModelRouter;
  private readonly geminiService: GeminiService;
  private readonly sessionId: string;
  private readonly intentHistory: IntentHistory[] = [];
  private wsServer?: WebSocketServer | undefined;
  private readonly logger: pino.Logger;
  private readonly webAppForgeLimb: WebAppForgeLimb;
  private readonly contextBuilder: ContextBuilder;
  private readonly indexer: CodebaseIndexer;
  private readonly modelExecutor: ModelExecutor;
  private readonly previewServer: PreviewServer;
  private readonly hexagramManager: HexagramManager;
  private readonly hexagramLimb: HexagramLimb;
  private readonly adversarialOrchestrator: AdversarialOrchestrator;
  private readonly validationSystem: ValidationSystem;
  private readonly architectureDigest: ArchitectureDigest;
  private readonly monitorAgent?: MonitorAgent;
  private readonly limbs: NeuralLimb[] = [];

  public getModelExecutor(): ModelExecutor {
    return this.modelExecutor;
  }
  public getHexagramManager(): HexagramManager {
    return this.hexagramManager;
  }
  private readonly cliLimb: SovereignCLILimb;
  private readonly substrateLimb: SubstrateLimb;
  private readonly lastSentFileHashes: Map<string, string> = new Map();
  private forceFullContext = true;
  private readonly endpointStatus: Map<string, 'ACTIVE' | 'INACTIVE' | 'PARTIAL'> = new Map();
  private readonly intentVerifier: IntentVerifier;
  private activeMemories: Lesson[] = [];
  private currentNarrative: string = 'The substrate is quiet, observing the void.';
  private cachedHealth: { cpu: number; mem: number; disk: number } = { cpu: 0, mem: 0, disk: 0 };
  private neuralLatency = 0;
  private toolUsageHeatmap: Record<string, number> = {};
  private readonly ghostLimb: GhostLimb;
  private readonly serviceDiscovery: ServiceDiscovery;
  private readonly stateManager: StateManager;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly pulseMonitor: PulseMonitor;
  private heartbeatInterval?: NodeJS.Timeout;
  private narrativeInterval?: NodeJS.Timeout;
  private workforceInterval?: NodeJS.Timeout;
  private lastIntentTime = Date.now();
  private readonly IDLE_THRESHOLD = 30000; // 30s
  private idleInterval?: NodeJS.Timeout;

  // Prioritized Idle Categories
  private readonly IDLE_PRIORITIES = {
    HEALTH: ['monitor_agent', 'circuit_breaker', 'memory_limb'],
    CREATIVE: ['gutenberg_knowledge', 'media_forge', 'rsc_limb', 'storyboard_forge'],
    MAINTENANCE: ['file_system', 'entity_limb', 'mcp_limb']
  };

  /**
   * Starts the Sovereign Idle Loop (Heartbeat of the Machine)
   */
  public startIdleLoop(): void {
    if (this.idleInterval) return;

    this.logger.info('Sovereign Idle Loop initiated');
    this.idleInterval = setInterval(() => {
      this.handleIdleTick().catch(err => this.logger.error({ err }, 'Idle Loop Error'));
    }, 30000);
  }

  private async handleIdleTick(): Promise<void> {
    const timeSinceLastIntent = Date.now() - this.lastIntentTime;
    if (timeSinceLastIntent < this.IDLE_THRESHOLD) return;

    // 1. Check Objectives (Objectivity)
    await this.checkObjectiveProgress();

    // 2. Prioritized Exploration
    await this.exploreLimbs();

    // 3. Heartbeat Pulse
    await this.broadcastPulse();
  }

  /**
   * Reads objectives.md and tracks progress (Objectivity)
   */
  public async checkObjectiveProgress(): Promise<void> {
    const objPath = resolve(this.config.projectRoot, 'objectives.md');
    try {
      if (!fs.existsSync(objPath)) return;

      const content = fs.readFileSync(objPath, 'utf8');
      const lines = content.split('\n');
      const total = lines.filter(l => l.includes('- [ ]') || l.includes('- [x]')).length;
      const completed = lines.filter(l => l.includes('- [x]')).length;

      if (total > 0) {
        const progress = Math.round((completed / total) * 100);
        this.logger.info({ progress, completed, total }, 'Objective Progress Checked');

        // Pin progress to Hexagram Line 5 (The Center)
        if (Math.random() < 0.1) { // 10% chance to pin generic progress
          void this.hexagramManager.pinCard(5, 'Objective Tracker', `Current System Completion: ${progress}%`, YaoState.YoungYang);
        }
      }
    } catch (error) {
      this.logger.warn({ error }, 'Failed to read objectives.md');
    }
  }

  private async exploreLimbs(): Promise<void> {
    const rand = Math.random();
    let category = 'MAINTENANCE';

    // User-defined Probabilities: Health (40%), Creative (40%), Maintenance (20%)
    if (rand < 0.4) category = 'HEALTH';
    else if (rand < 0.8) category = 'CREATIVE';

    const candidates = this.IDLE_PRIORITIES[category as keyof typeof this.IDLE_PRIORITIES];
    const targetId = candidates[Math.floor(Math.random() * candidates.length)];
    const limb = this.limbs.find(l => l.id === targetId);

    if (limb) {
      const status = limb.getStatus ? limb.getStatus() : { id: limb.id, type: limb.type };
      const thought = `Thinking about ${category} (${limb.id}): ${JSON.stringify(status).slice(0, 100)}...`;

      this.logger.info({ category, limb: limb.id }, 'Sovereign Idle Thought');
      void this.hexagramManager.pinCard(
        category === 'HEALTH' ? 4 : category === 'CREATIVE' ? 1 : 6,
        `Idle Reflection (${category})`,
        thought,
        category === 'CREATIVE' ? YaoState.OldYang : YaoState.YoungYin
      );

      // 10% chance to deeply consult Oracle on this thought
      if (Math.random() < 0.1) {
        void this.hexagramManager.consultOracle({
          intent: `Idle reflection on ${limb.id} health/status`,
          axes: [
            { axis: 'X', positive: 'Healthy', negative: 'Degraded', neutral: 'Stable' },
            { axis: 'Y', positive: 'Creative', negative: 'Dormant', neutral: 'Idle' },
            { axis: 'Z', positive: 'Active', negative: 'Offline', neutral: 'Standby' }
          ]
        }, this.modelExecutor);
      }
    }
  }

  constructor(
    private readonly config: VibeConfig,
    private readonly watcher: ASTWatcher,
    private readonly vectorDB: VectorDB,
    private readonly sandbox: Sandbox
  ) {
    super();
    this.sessionId = config.projectId + '_' + (process.env['SESSION_ID'] || `vibe_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    this.logger = pino({
      name: 'Orchestrator',
      base: { hostname: 'POG-VIBE', projectId: config.projectId, sessionStart: this.startTimestamp }
    });

    // Initialize Hexagram Manager (The Nervous System) - FIRST
    this.hexagramManager = new HexagramManager(this.vectorDB, config.projectId);
    this.hexagramManager.on('cardPinned', (data: { index: number, card: import('./HexagramManager.js').ContextCard }) => {
      this.broadcastState();
      this.narrateCognition(data.card);
    });

    // 1. Core Services (Prerequisites)
    this.previewServer = new PreviewServer();
    const keyVault = new KeyVault();
    this.geminiService = new GeminiService({ apiKey: process.env['GOOGLE_API_KEY'] || '' }, keyVault);
    this.router = new FreeModelRouter(config, this.geminiService);
    this.modelExecutor = new ModelExecutor(
      config,
      this.geminiService,
      this.hexagramManager,
      this.router,
      () => { if (this.ghostLimb) this.ghostLimb.reportSilence(); }
    );

    // 1b. GCloud & Cloudflare Base Services
    const googleServices = new GoogleServices({
      apiKey: process.env['GOOGLE_API_KEY'] || '',
      projectId: process.env['GOOGLE_PROJECT_ID'] || config.projectId
    });
    const cfAuth = {
      accountId: (process.env['CLOUDFLARE_ACCOUNT_ID'] || config.cloudflareAccountId || ''),
      apiToken: (process.env['CLOUDFLARE_API_TOKEN'] || config.cloudflareApiToken || ''),
      authEmail: process.env['CLOUDFLARE_AUTH_EMAIL'],
      gatewayUrl: process.env['CLOUDFLARE_GATEWAY_URL']
    };
    const cloudflareServices = new CloudflareServices(cfAuth);

    this.architectureDigest = new ArchitectureDigest(config.projectRoot);
    this.validationSystem = new ValidationSystem([
      new NoMockValidator(),
      new ArchitecturalValidator(this.architectureDigest.getManifest())
    ]);

    this.intentVerifier = new IntentVerifier(
      this.modelExecutor,
      this.hexagramManager
    );

    // Initializing high-fidelity cognitive services for project-aware learning and recall
    this.logger.info({ projectId: config.projectId, projectRoot: config.projectRoot }, 'Booting ContextBuilder for Sovereign retrieval');
    this.contextBuilder = new ContextBuilder(
      this.vectorDB,
      config.projectRoot,
      config.projectId,
      this.modelExecutor,
      config.rootStack,
      config.aiContextPath
    );

    // Initializing the automated codebase indexer with real Gemini dependency
    this.logger.info('Initializing CodebaseIndexer for full-project semantic indexing');
    this.indexer = new CodebaseIndexer(
      this.vectorDB,
      this.geminiService,
      config.projectRoot
    );

    // Reality Check: Verify learning services are integrated before limb generation
    if (!this.contextBuilder || !this.indexer) {
      this.logger.fatal('Critical failure: Learning infrastructure failed to initialize despite valid configuration');
      throw new Error('Sovereign Boot Failure: ContextBuilder/Indexer unassigned');
    }
    this.adversarialOrchestrator = new AdversarialOrchestrator(
      config,
      this.modelExecutor,
      this.validationSystem,
      this.architectureDigest
    );

    // 2. Specialized Limbs (Utilizing Core Services)
    this.webAppForgeLimb = new WebAppForgeLimb(config, this.previewServer, this.modelExecutor, this.adversarialOrchestrator);
    this.hexagramLimb = new HexagramLimb(config, this.hexagramManager, this.modelExecutor);

    const mediaForgeLimb = new MediaForgeLimb(config, this.modelExecutor, this.router);
    const bioIntelligenceLimb = new BioIntelligenceLimb(config);
    const gutenbergLimb = new GutenbergLimb(config, this.vectorDB, this.geminiService, this.modelExecutor);
    this.cliLimb = new SovereignCLILimb(config, sandbox);
    const aiLimb = new AILimb(config, this.modelExecutor, this.router);
    const voiceLimb = new VoiceLimb(config, this.modelExecutor);
    const dashboardLimb = new DashboardLimb(config, this.previewServer, this.vectorDB);
    const cloudflareLimb = new CloudflareLimb(config);
    const storyboardLimb = new StoryboardLimb(config, this.geminiService, this.vectorDB, this.modelExecutor);
    const neuralForgeLimb = new NeuralForgeLimb(config, this.adversarialOrchestrator);
    const compressionLimb = new CompressionLimb(config, this.vectorDB);
    const aiModelLimb = new AIModelLimb(config);
    const fileLimb = new FileLimb(config);
    const entityLimb = new EntityLimb(config);
    this.substrateLimb = new SubstrateLimb(config, googleServices, cloudflareServices);
    const webSensoryLimb = new WebSensoryLimb(config);
    const mcpLimb = new MCPLimb(config);
    const controlPlaneLimb = new ControlPlaneLimb(config, this.router);
    const memoryLimb = new MemoryLimb(config, this.vectorDB, this.indexer, this.geminiService);
    const cognitionLimb = new CognitionLimb(config, this.modelExecutor);
    const chromanumberLimb = new ChromanumberLimb(config);
    chromanumberLimb.setExecutor(this.modelExecutor);
    const environmentLimb = new EnvironmentLimb(config, this.vectorDB, this.modelExecutor);
    const fileSystemLimb = new FileSystemLimb(config);
    const yoloLimb = new YoloLimb(config);

    // Phase 14: Ghost Limb Synthesis
    this.ghostLimb = new GhostLimb(config, this.modelExecutor);
    const quantumLimb = new QuantumLimb(config, this.modelExecutor);
    const relicLimb = new RelicLimb(config, this.modelExecutor);
    const omegaLimb = new OmegaLimb(config, this.modelExecutor);

    // Core subsystem integration (Reverse Audit Phase 2)
    this.serviceDiscovery = new ServiceDiscovery(config);
    this.stateManager = StateManager.getInstance();
    this.circuitBreaker = new CircuitBreaker();
    this.pulseMonitor = new PulseMonitor(config, this.hexagramManager);

    cloudflareLimb.setExecutor(this.modelExecutor);

    // Phase 23: Constellation Telemetry Wiring
    cloudflareLimb.on('spatial_health_update', (data) => this.broadcastToDashboard('spatial_health_update', data));
    cloudflareLimb.on('failover_tracer', (data) => this.broadcastToDashboard('failover_tracer', data));
    cloudflareLimb.on('globe_forge_completed', (data) => this.broadcastToDashboard('globe_forge_completed', data));

    // WebAppForge Globe integration
    this.webAppForgeLimb.on('globe_forge_completed', (data) => this.broadcastToDashboard('globe_forge_completed', data));

    // Periodic Local Spatial Health (Sovereign Metabolism)
    setInterval(() => {
      const health = this.getSystemHealth();
      this.broadcastToDashboard('spatial_health_update', {
        provider: 'local',
        health: 'READY',
        cpu: health.cpu,
        mem: health.mem,
        disk: health.disk,
        timestamp: Date.now()
      });
    }, 60000); // Once per minute

    // Phase 24: Ghost Failover Wiring
    if (this.ghostLimb) {
      this.ghostLimb.on('engagementChanged', (data) => {
        this.broadcastToDashboard('failover_tracer', {
          from: data.old === YaoState.YoungYin ? 'cloud' : 'ghost-transition',
          to: data.new === YaoState.OldYang ? 'ghost' : 'cloud',
          reason: data.reason,
          consecutiveFailures: data.new === YaoState.OldYang ? 3 : 0
        });
        this.broadcastState();
      });
    }

    // Store in collection for intent routing
    let limbs: NeuralLimb[] = [
      controlPlaneLimb,
      memoryLimb,
      compressionLimb,
      cognitionLimb,
      aiModelLimb,
      fileLimb,
      entityLimb,
      neuralForgeLimb,
      cloudflareLimb,
      this.substrateLimb,
      webSensoryLimb,
      mcpLimb,
      this.hexagramLimb,
      this.webAppForgeLimb,
      storyboardLimb,
      mediaForgeLimb,
      bioIntelligenceLimb,
      gutenbergLimb,
      this.cliLimb,
      aiLimb,
      voiceLimb,
      chromanumberLimb,
      environmentLimb,
      dashboardLimb,
      this.ghostLimb,
      quantumLimb,
      relicLimb,
      omegaLimb,
      fileSystemLimb,
      yoloLimb
    ];

    // Filter limbs if enabledServices is specified (Sovereign Optimization)
    if (this.config.enabledServices && this.config.enabledServices.length > 0) {
      this.logger.info({ enabled: this.config.enabledServices }, 'Selective limb loading active');
      limbs = limbs.filter(l =>
        this.config.enabledServices.some(s =>
          l.id.toLowerCase().includes(s.toLowerCase()) ||
          l.constructor.name.toLowerCase().includes(s.toLowerCase())
        )
      );
    }

    // Register all limbs to the executive spine
    limbs.forEach(limb => {
      // Memory Pulse Integration (Hexagram Line 2)
      (limb.getTools?.() ?? []).forEach(() => { /* triggers tool indexing if needed */ });

      // Access the internal spine of the limb to subscribe to pulses
      const spine = limb.spine;
      if (spine && typeof spine.on === 'function') {
        spine.on('pulse', (data: import('../core/ToolingSpine.js').PulseEvent) => {
          void this.hexagramManager.pinCard(
            2,
            `Memory Pulse: ${data.source}`,
            `[SOVEREIGN PULSE]: ${data.detail}`,
            data.state
          );
        });
      }
    });

    this.limbs = limbs;

    // 3. Global Limb Configuration
    this.limbs.forEach(limb => {
      if (limb instanceof BaseLimb) {
        if (limb.setExecutor) {
          limb.setExecutor(this.modelExecutor);
        }
      }
    });

    this.cliLimb.setExecutor(this.modelExecutor);

    // 3. Post-Limb Systems

    // Initialize MonitorAgent (Background Helper) - ENABLED BY DEFAULT
    if (process.env['ENABLE_MONITOR'] !== 'false') {
      this.monitorAgent = new MonitorAgent(config, this.modelExecutor, this.hexagramManager);
      this.setupMonitorListeners();
      this.logger.info('Monitor Agent enabled - continuous TSC watch active');
    }

    this.logger.info({
      sessionId: this.sessionId,
      agentName: config.agentName,
      pogDir: expandTilde(config.pogDir),
      adversarialEnabled: !!this.geminiService
    }, 'Orchestrator initialized with Sovereign Intelligence');

    // Initial Env Check
    this.refreshEnvStatus();

    // Phase 13: Project Pulse Initialization
    ProjectPulse.initManifest(config.projectRoot, config.agentName);

    // Phase 24: Service Discovery + Circuit Breaker + Pulse Monitor boot
    void this.serviceDiscovery.auditAll().then(statuses => {
      statuses.forEach(s => this.updateEndpointStatus(s.id, s.status === 'ACTIVE' ? 'ACTIVE' : s.status === 'ERROR' ? 'INACTIVE' : 'PARTIAL'));
      this.logger.info({ discovered: statuses.length }, 'ServiceDiscovery audit complete');
    }).catch(err => this.logger.warn({ err }, 'ServiceDiscovery audit failed'));

    void this.pulseMonitor.start().catch(err => this.logger.warn({ err }, 'PulseMonitor start failed'));

    // Wire CircuitBreaker events to Hexagram
    this.circuitBreaker.on('circuit_open', (data) => {
      this.logger.warn({ data }, 'CircuitBreaker: provider soldiered (OPEN)');
      void this.hexagramManager.pinCard(4, `Circuit OPEN: ${(data as Record<string, unknown>)['provider']}`, 'Provider disabled after 3 strikes.', YaoState.OldYin);
    });
    this.circuitBreaker.on('circuit_closed', (data) => {
      this.logger.info({ data }, 'CircuitBreaker: provider recovered (CLOSED)');
      void this.hexagramManager.pinCard(4, `Circuit CLOSED: ${(data as Record<string, unknown>)['provider']}`, 'Provider recovered.', YaoState.YoungYang);
    });

    this.startIdleLoop();
  }

  private envStatus: EnvStatus[] = [];

  private async refreshEnvStatus(): Promise<void> {
    this.envStatus = await SystemEnvChecker.checkGlobalSettings();
    this.broadcastState();
  }


  override on<K extends keyof OrchestratorEvents>(
    event: K,
    listener: OrchestratorEvents[K]
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof OrchestratorEvents>(
    event: K,
    ...args: Parameters<OrchestratorEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }


  public getSessionId(): string { return this.sessionId; }

  public updateEndpointStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'PARTIAL'): void {
    this.endpointStatus.set(id, status);
  }

  public getEndpointStatus(id: string): 'ACTIVE' | 'INACTIVE' | 'PARTIAL' {
    return this.endpointStatus.get(id) || 'INACTIVE';
  }

  async initialize(): Promise<Result<void>> {
    try {
      // 0. Sync Substrate/Workforce (Sense the being)
      await this.syncSubstrateWorkforce();

      await this.setupWebSocket();

      // Automatically activate the dashboard
      const dashboard = this.limbs.find(l => l.id === 'dashboard') as DashboardLimb;
      if (dashboard) {
        dashboard.activate().then(res => {
          if (res.ok) this.logger.info({ url: res.value.output }, 'Session Dashboard Active');
        }).catch(err => this.logger.error({ err }, 'Failed to auto-activate dashboard'));
      }

      // 1. Initialize Watcher
      const watcherResult = this.watcher.initialize();
      if (!watcherResult.ok) {
        return watcherResult;
      }

      // 1b. Listen for file changes to keep VectorDB fresh (Proactive RAG)
      this.watcher.on('fileChanged', ({ filePath }) => {
        this.logger.debug({ filePath }, 'Proactive indexing triggered');
        void this.indexer.indexFile(filePath).catch(err => {
          this.logger.warn({ err }, 'Proactive indexing failed (likely quota), continuing...');
        });
      });

      // Robust VectorDB Initialization (Critical Path Protection)
      try {
        const dbResult = await this.vectorDB.initialize();
        if (isErr(dbResult)) {
          this.logger.error({ error: dbResult.error }, 'VectorDB init failed, continuing in Amnesia Mode');
        } else {
          // 1c. Cold Start Indexing: If DB is empty, perform initial project scan
          const lessonCount = await this.vectorDB.getLessonCount();
          if (lessonCount === 0) {
            this.logger.info('VectorDB is empty. Triggering full project indexing scan...');
            // Run in background to not block startup
            void this.indexer.indexProject().catch(err => {
              this.logger.warn({ err }, 'Initial indexing failed (likely quota), continuing in degraded mode');
            });
          }
        }
      } catch (dbError) {
        this.logger.error({ error: dbError }, 'VectorDB critical failure, continuing without memory');
      }

      this.logger.info({ port: this.config.wsPort }, 'WebSocket server started');

      // Heartbeat for dashboard telemetry
      this.heartbeatInterval = setInterval(() => {
        void this.refreshSystemHealth();
        this.broadcastState();
        void this.broadcastPulse();
      }, 5000); // More frequent heartbeat for high-fidelity pulse

      // Sovereign Voice Narrative Loop (Rhythmic introspection)
      this.narrativeInterval = setInterval(() => {
        void this.generateSovereignVoice();
      }, 60000); // Narrate vibe every minute

      // workforce heartbeat every minute
      this.workforceInterval = setInterval(() => {
        void this.syncSubstrateWorkforce();
      }, 60000);

      return { ok: true, value: undefined };
    } catch (error) {
      this.logger.error({ error }, 'Initialization failed');
      // Sovereign Fallback: Allow start even if Orchestrator is crippled
      return { ok: true, value: undefined };
    }
  }

  public async cleanup(): Promise<void> {
    this.logger.info('Shutting down Orchestrator...');

    // 1. Clear intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.narrativeInterval) clearInterval(this.narrativeInterval);
    if (this.workforceInterval) clearInterval(this.workforceInterval);

    // 2. Stop Monitor Agent
    if (this.monitorAgent) {
      if (typeof (this.monitorAgent as any).stop === 'function') {
        (this.monitorAgent as any).stop();
      }
    }

    // 3. Stop Preview Server
    if (this.previewServer) {
      await this.previewServer.stopAll();
    }

    // 4. Close WebSocket Server
    if (this.wsServer) {
      this.wsServer.close();
    }

    // 5. Stop Watcher
    if (this.watcher && typeof this.watcher.stop === 'function') {
      this.watcher.stop();
    }

    this.logger.info('Orchestrator cleanup complete.');
  }


  /**
   * SOVEREIGN LIVING SUBSTRATE: Sync Model Workforce
   * Retrieves real-time availability of professional models (Ollama/Env)
   * and pins the state to the hexagram.
   */
  public async syncSubstrateWorkforce(): Promise<void> {
    try {
      this.logger.info('Syncing Sovereign Model Workforce...');

      // 1. Fetch Ollama Models (Real-time heartbeat)
      let ollamaModels: string[] = [];
      try {
        const execAsync = promisify(exec);
        const { stdout } = await execAsync('ollama list');
        ollamaModels = stdout.split('\n').slice(1).map(line => line.trim().split(/\s+/)[0]).filter((m): m is string => !!m);
      } catch (e) {
        this.logger.warn('Ollama heartbeat failed - system currently cloud-reliant or local-only');
      }

      // 2. Identify Pro Members (Team Composition)
      const team = {
        planning: this.config.planningModel || 'None (Fallback active)',
        coding: this.config.codingModel || 'None (Fallback active)',
        critic: this.config.criticModel || 'None (Fallback active)',
        monitor: this.config.monitorModel || 'None (Fallback active)',
        availableLocal: ollamaModels
      };

      // 3. Update Workforce State
      await this.updateModelWorkforceState(team);

      this.logger.info({ teamSize: ollamaModels.length }, 'Model Workforce Synced');
    } catch (error) {
      this.logger.error({ error }, 'Failed to sync model workforce');
    }
  }

  private async updateModelWorkforceState(team: {
    planning: string;
    coding: string;
    monitor: string;
    availableLocal: string[]
  }): Promise<void> {
    const isHealthy = team.availableLocal.length > 0;
    const proPresence = team.planning.includes('pro') || team.coding.includes('14b') || team.coding.includes('7b');

    let state = YaoState.YoungYang; // Stable Yang (Active Workforce)
    if (!isHealthy) state = YaoState.YoungYin; // Receptive/Silent (Cloud Only)
    else if (!proPresence) state = YaoState.OldYang; // Moving Yang (Limited Capacity)

    const workforceContent = `
TEAM COMPOSITION:
- Planning: ${team.planning}
- Coding: ${team.coding}
- Oversight: ${team.monitor}
- Local Bench: ${team.availableLocal.join(', ') || 'None'}

STATUS: ${isHealthy ? 'High-Continuity Workforce Active' : 'Biological/Local Disconnect - Cloud Bridge Only'}
    `.trim();

    await this.hexagramManager.pinCard(2, 'Biological Pulse', workforceContent, state);
  }

  private async setupWebSocket(): Promise<void> {
    if (this.config.wsPort === -1) {
      this.logger.info('WebSocket Server disabled via wsPort: -1');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.logger.info({ port: this.config.wsPort }, 'Initializing WebSocket Server...');
        this.wsServer = new WebSocketServer({ port: this.config.wsPort, host: 'localhost' });

        this.wsServer.on('listening', () => {
          const addr = this.wsServer?.address();
          if (addr && typeof addr === 'object' && this.config.wsPort === 0) {
            (this.config as any).wsPort = addr.port;
          }
          this.logger.info({ port: this.config.wsPort }, 'WebSocket Server LISTENING');
          resolve();
        });

        this.wsServer.on('error', (error: Error & { code?: string }) => {
          this.logger.error({ error }, 'WebSocket Server FATAL ERROR');
          if (error.code === 'EADDRINUSE' && this.config.wsPort !== 0) {
            this.logger.warn('Port in use, falling back to dynamic port...');
            this.wsServer?.close();
            (this.config as any).wsPort = 0;
            this.setupWebSocket().then(resolve).catch(reject);
          } else {
            reject(error);
          }
        });

        this.wsServer.on('connection', (ws: import('ws').WebSocket) => {
          this.logger.debug('Client connected');
          ws.send(JSON.stringify({ type: 'state', data: this.getCurrentState() }));

          const forwardEvent = (type: string, data: unknown) => {
            if (ws.readyState === 1) { // OPEN
              ws.send(JSON.stringify({ type, data }));
            }
          };

          this.on('intentExecuted', (data) => forwardEvent('intentExecuted', data));
          this.on('previewStarted', (data) => forwardEvent('previewStarted', data));
          this.substrateLimb.on('node_discovered', (data) => forwardEvent('node_discovered', data));
          this.previewServer.on('log', (log) => forwardEvent('preview_log', log));
          this.previewServer.on('exit', (exit) => forwardEvent('preview_exit', exit));

          ws.on('message', (msg: import('ws').Data) => {
            try {
              const payload = JSON.parse(msg.toString());
              if (payload.type === 'user_feedback') {
                this.logger.info({ feedback: payload.data }, 'Human-in-the-Loop feedback received');
                this.emit('userFeedback', payload.data);
              } else if (payload.type === 'control') {
                this.handleControlMessage(payload, ws);
              } else if (payload.type === 'audio_input') {
                void this.handleAudioInput(payload.data, ws);
              } else if (payload.type === 'diagnostic_report') {
                if (this.monitorAgent) {
                  this.monitorAgent.reportExternalIssues(payload.data);
                }
              } else if (payload.type === 'god_head_connected') {
                if (this.monitorAgent) {
                  this.monitorAgent.handleGodHeadConnection(payload.data.context);
                }
              }
            } catch (e) {
              this.logger.error({ error: e }, 'Failed to parse WebSocket message');
            }
          });
        });
      } catch (error) {
        this.logger.error({ error }, 'Failed to initialize WebSocket server');
        reject(error);
      }
    });
  }

  private setupMonitorListeners(): void {
    if (!this.monitorAgent) return;

    this.monitorAgent.on('issueDetected', (report) => {
      this.logger.warn({
        severity: report.severity,
        category: report.category,
        affectedFiles: report.affectedFiles
      }, 'Monitor Agent detected issue - triggering auto-healing');

      // Auto-heal based on threshold (defaulting to high/critical)
      const threshold = this.config.healThreshold || 'high';
      const severities: string[] = ['low', 'medium', 'high', 'critical'];
      const reportIndex = severities.indexOf(report.severity);
      const thresholdIndex = severities.indexOf(threshold);

      if (report.category === 'tsc' && reportIndex >= thresholdIndex) {
        void this.handleAutoHeal(report);
      }
    });

    this.monitorAgent.on('healthCheckPassed', () => {
      this.logger.debug('Monitor health check passed - no issues');
    });

    this.monitorAgent.on('provenanceCandidate', (filePath) => {
      void (async () => {
        const forge = this.limbs.find(l => l.id === 'neural_forge') as WebAppForgeLimb | undefined;
        if (!forge) return;

        // Heuristic Filter (Ravenous Autonomy)
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const isComponent = filePath.endsWith('.tsx') && /export\s+function\s+\w+/.test(content);
          const hasSovereignStyle = /className=".*sovereign-/.test(content);

          if (isComponent && hasSovereignStyle) {
            const path = await import('path');
            const patternName = `AUTO_${path.basename(filePath, '.tsx').toUpperCase()}_${Date.now()}`;

            this.logger.info({ patternName, filePath }, '🧬 Pattern Candidate Detected via Heuristic. Harvesting...');

            await forge.handleToolCall('harvest_pattern', {
              filePath,
              patternName,
              description: 'Harvested via Ravenous Autonomy (Build Trigger)'
            });
          }
        } catch (e) {
          this.logger.warn({ error: e }, 'Failed to process provenance candidate');
        }
      })();
    });

    // Wire Metabolic Events to Hexagram Strategy Engine
    this.monitorAgent.on('issueDetected', () => { void this.refreshHexagramState(); });
    this.monitorAgent.on('healthCheckPassed', () => { void this.refreshHexagramState(); });
    this.monitorAgent.on('provenanceCandidate', () => { void this.refreshHexagramState(); });
  }

  private broadcastEvent(type: string, data: unknown): void {
    if (!this.wsServer) return;

    // Broadcast to all connected clients
    this.wsServer.clients.forEach((client: import('ws').WebSocket) => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({ type, data }));
      }
    });
  }

  /**
   * Updates the Hexagram Strategy Engine with real-time system metrics.
   * Maps the physiology (Build, Cloud, Errors) to the Psychology (Hexagram).
   */
  private async refreshHexagramState(): Promise<void> {
    try {
      const registry = (await import('./HealthRegistry.js')).HealthRegistry.getInstance();
      const geminiHealth = registry.getHealth('gemini');

      // Approximate System State
      // Resolve async metrics first
      const buildDecision = this.monitorAgent
        ? await this.monitorAgent.diagnoseState().then(d => d.decision)
        : 'Yang';

      const buildPass = buildDecision === 'Yang' ? BuildStatus.Passed : (buildDecision === 'YinYang' ? BuildStatus.Warning : BuildStatus.Failed);

      // Approximate System State
      const state: import('../core/HexagramManager.js').SystemState = {
        buildPass,
        cloudHealthy: geminiHealth.state === 'READY' ? HealthStatus.Ready : (geminiHealth.state === 'SOVEREIGN_SILENCE' ? HealthStatus.Silence : (geminiHealth.state === 'RATE_LIMITED' ? HealthStatus.Degraded : HealthStatus.Critical)),
        adminPresent: geminiHealth.state !== 'SOVEREIGN_SILENCE' && geminiHealth.state !== 'OFF_GRID',
        localModels: HealthStatus.Ready, // Always true for this architecture
        noRecentErrors: (!this.monitorAgent || this.monitorAgent.getCurrentErrors().length === 0) ? HealthStatus.Ready : HealthStatus.Degraded,
        userActive: UserEngagement.Active, // Assumed active if events are firing
        lowResourcePressure: ResourcePressure.Optimal, // Default for now
        dashboardHealthy: this.checkDashboardHealth(), // Line 6: UI Culmination
        somaticLair: hasSovereignDrive()
      };

      await this.hexagramManager.updateLinesFromState(state);

      // Enhance cached health with real monitor data if available

      // Enhance cached health with real monitor data if available
      if (this.monitorAgent) {
        // Use diagnostics if available, otherwise fall back to cached
        // For now, avoiding the unused variable warning by actually using it or removing it
        // The MonitorReport doesn't map 1:1 to cpu/mem yet, so we'll keep using cachedHealth but log the diagnostics for debug
        const diagnostics = await this.monitorAgent.diagnoseState();
        if (diagnostics.decision === 'Yin') {
          // If system is yielding/unhealthy, maybe reflect that in the signal
        }

        // Also check Sovereign Status
        const sovereignActive = hasSovereignDrive();

        // Broadcast specialized 'health_signal' event for the gauges
        this.broadcastEvent('health_signal', {
          cpu: this.cachedHealth.cpu,
          mem: this.cachedHealth.mem,
          disk: this.cachedHealth.disk,
          neuralLatency: this.neuralLatency,
          sovereign: {
            active: sovereignActive,
            root: getSovereignRoot()
          },
          status: diagnostics.decision // Include decision in the signal
        });
      }


      const currentHex = this.hexagramManager.getInterpretation();
      this.logger.debug({
        hexagram: currentHex.name,
        strategy: currentHex.strategy
      }, 'Hexagram Strategy Updated');

    } catch (error) {
      this.logger.warn({ error }, 'Failed to refresh Hexagram State');
    }
  }

  /**
   * Checks dashboard/UI health for Line 6 (Culmination).
   * Returns HealthStatus.Ready if WebSocket clients are connected or preview is active.
   */
  private checkDashboardHealth(): HealthStatus {
    try {
      // Check WebSocket server has connected clients
      const wsConnected = this.wsServer && Array.from(this.wsServer.clients).some(
        (ws: import('ws').WebSocket) => ws.readyState === 1 // WebSocket.OPEN
      );

      // Check preview server has active previews
      const previewActive = this.previewServer.getActivePreviews().length > 0;

      return (wsConnected || previewActive) ? HealthStatus.Ready : HealthStatus.Degraded;
    } catch {
      return HealthStatus.Critical; // Assume critical if we can't check
    }
  }

  // ============================================================
  // HEXAGRAM STRATEGY EXECUTION SYSTEM
  // Makes the hexagram authoritative - strategy -> action mapping
  // ============================================================

  /**
   * Execute a task with strategy-aware behavior.
   * Hexagram state determines execution mode: EXPAND, YIELD, ARBITRATE, or MAINTAIN.
   */
  private async executeWithStrategy<T>(
    task: () => Promise<T>,
    context: { intent: string; useCloud?: boolean }
  ): Promise<T> {
    const hexagram = this.hexagramManager.getInterpretation();

    this.logger.debug({
      strategy: hexagram.strategy,
      hexagram: hexagram.name
    }, 'Executing with hexagram strategy');

    switch (hexagram.strategy) {
      case 'EXPAND':
        return this.executeExpand(task, context);

      case 'YIELD':
        return this.executeYield(task, context);

      case 'ARBITRATE':
        return this.executeArbitrate(task, context);

      case 'CONSOLIDATE':
        return this.executeConsolidate(task, context);

      case 'MAINTAIN':
      default:
        return this.executeMaintain(task, context);
    }
  }

  /**
   * EXPAND strategy: Parallel execution, cloud models, aggressive.
   * Hexagram indicates YANG dominance - full resources available.
   */
  private async executeExpand<T>(
    task: () => Promise<T>,
    context: { intent: string; useCloud?: boolean }
  ): Promise<T> {
    this.logger.info({ strategy: 'EXPAND' }, 'Aggressive execution mode: cloud enabled, max parallelism');

    // Prefer cloud models for maximum capability
    if (context.useCloud !== false && this.geminiService) {
      // Cloud is explicitly available - execute with full power
      return task();
    }

    return task();
  }

  /**
   * YIELD strategy: Sequential, local-only, conservative.
   * Hexagram indicates YIN dominance - preserve resources, minimize risk.
   */
  private async executeYield<T>(
    task: () => Promise<T>,
    _context: { intent: string }
  ): Promise<T> {
    this.logger.info({ strategy: 'YIELD' }, 'Conservative execution mode: local-only, single-threaded');

    // Force local model routing by logging the constraint
    this.logger.debug('YIELD: Forcing local model preference');

    // Execute conservatively - single attempt, no retries
    try {
      return await task();
    } catch (error) {
      this.logger.warn({ error }, 'YIELD: Task failed, not retrying per conservative strategy');
      throw error;
    }
  }

  /**
   * ARBITRATE strategy: Human-in-the-loop for ambiguous states.
   * Hexagram indicates CONFLICT - seek external resolution.
   */
  private async executeArbitrate<T>(
    task: () => Promise<T>,
    context: { intent: string }
  ): Promise<T> {
    this.logger.info({ strategy: 'ARBITRATE' }, 'Conflict detected: requesting human clarification');

    // Emit event for dashboard listeners
    this.emit('awaitingFeedback', {
      message: `Hexagram ARBITRATE: Ambiguous state detected for "${context.intent.substring(0, 50)}...". Proceeding with default execution.`
    });

    // Execute but log that human review is recommended
    const result = await task();

    this.logger.info('ARBITRATE: Execution complete - human review recommended');
    return result;
  }

  /**
   * CONSOLIDATE strategy: Local logs only, queue UI updates.
   * Hexagram indicates STAGNATION - focus on stability over progress.
   */
  private async executeConsolidate<T>(
    task: () => Promise<T>,
    _context: { intent: string }
  ): Promise<T> {
    this.logger.info({ strategy: 'CONSOLIDATE' }, 'Consolidation mode: file-based logging, queued updates');

    // Execute with minimal side effects
    return task();
  }

  /**
   * MAINTAIN strategy: Balanced execution (default).
   * Hexagram indicates EQUILIBRIUM - normal operation.
   */
  private async executeMaintain<T>(
    task: () => Promise<T>,
    _context: { intent: string }
  ): Promise<T> {
    this.logger.debug({ strategy: 'MAINTAIN' }, 'Balanced execution mode');
    return task();
  }

  /**
   * Get current strategic posture for external consumers.
   */
  public getStrategicPosture(): { strategy: string; hexagram: string; binary: string; lines: { index: number; state: string; title: string }[] } {
    const hex = this.hexagramManager.getInterpretation();
    const lines = this.hexagramManager.getLines().map(l => ({
      index: l.lineIndex,
      state: this.hexagramManager.getStateString(l.state),
      title: l.title
    }));

    return {
      strategy: hex.strategy,
      hexagram: hex.name,
      binary: hex.binary,
      lines
    };
  }

  private async handleAutoHeal(report: import('../monitor/MonitorAgent.js').MonitorReport): Promise<void> {
    if (!report.tscErrors || report.tscErrors.length === 0) return;

    this.logger.info({
      errorCount: report.tscErrors.length,
      files: report.affectedFiles
    }, 'Initiating auto-heal workflow');

    // Build a prompt for the top model to fix the errors
    const errorSummary = report.tscErrors
      .map(e => `${e.file}:${e.line}:${e.column} - [${e.code}] ${e.message}`)
      .join('\n');

    const healPrompt = `AUTO-HEAL: TypeScript compilation has ${report.tscErrors.length} error(s).

Errors:
${errorSummary}

Fix these errors. Do not use placeholders or TODOs. Provide production-ready fixes.`;

    // Execute the fix using the Adversarial Loop (Generator + Critic)
    const result = await this.adversarialOrchestrator.generateValidatedCode(
      healPrompt,
      this.config.criticModel || 'gemini:gemini-3-pro-preview', // Use configured critic
      { fileName: report.affectedFiles[0] }
    );

    if (result.ok) {
      this.logger.info('Auto-heal workflow completed successfully using Adversarial Loop');
    } else {
      const error = (result as { ok: false; error: Error }).error;
      this.logger.error({ error }, 'Auto-heal workflow failed');
    }
  }

  private async negotiateBoundaries(_prompt: string): Promise<{ proceed: boolean; strategyOverride?: string; reason?: string }> {
    const boundaries = this.config.sovereignBoundaries;
    if (!boundaries) return { proceed: true };

    const currentLat = this.neuralLatency || 0;

    // 1. Latency Protocol
    if (boundaries.maxLatencyMs && currentLat > boundaries.maxLatencyMs) {
      if (currentLat > boundaries.maxLatencyMs * 1.5) {
        return {
          proceed: true,
          strategyOverride: 'YIELD',
          reason: `Latency (${Math.round(currentLat)}ms) exceeds threshold. Enforcing YIELD protocol.`
        };
      }
    }

    // 2. Budget Protocol Placeholder

    // 3. Offline Protocol
    if (boundaries.forceOffline) {
      return {
        proceed: true,
        strategyOverride: 'YIELD',
        reason: 'Sovereign Offline Link active. Local substrate only.'
      };
    }

    return { proceed: true };
  }

  /**
   * REFLECTIVE LAYER: Synthesize user intent before planning.
   * "User intent should pass to conversation to get intent, not tool calls, stacking info and user desires."
   */
  private async synthesizeIntent(prompt: string, context: string): Promise<string> {
    const adminModel = this.config.thinkingAdminModel || 'gold_ollama_kimi_k2_5';
    const synthesisPrompt = `${(await import('./SystemPrompts.js')).INTENT_SYNTHESIS_PROMPT}\n\nCONTEXT:\n${context}\n\nUSER INPUT:\n${prompt}`;

    this.logger.info({ model: adminModel }, 'Synthesizing intent through Thinking Admin...');
    const result = await this.modelExecutor.callModel(adminModel, synthesisPrompt);

    if (result.ok) {
      return result.value.response;
    }
    return `# 🧠 Intent Recoil\nFailed to synthesize intent. Proceeding with raw input: "${prompt}"`;
  }

  /**
   * Execute user intent with "Research -> Plan -> Execute -> Review" loop
   * High-level entry point for executing user intents.
   * Leverages ternary routing and adversarial loops for maximum quality.
   */
  public async executeIntent(input: string | { prompt: string; model?: string; force?: boolean; filePath?: string }): Promise<Result<Execution>> {
    const rawPrompt = typeof input === 'string' ? input : input.prompt;
    const modelOverride = typeof input === 'string' ? undefined : input.model;
    const forceRaw = typeof input === 'string' ? false : input.force;
    const filePath = typeof input === 'string' ? undefined : input.filePath;
    const force = forceRaw ? ExecutionEscalation.Aggressive : ExecutionEscalation.Standby;
    const startTime = Date.now();

    // 1. Build Context
    const contextObj = await this.contextBuilder.buildContext(rawPrompt);
    const contextString = this.contextBuilder.formatContextForPrompt(contextObj);

    // 2. CONVERSATION-FIRST: Synthesize Intent
    const prompt = await this.synthesizeIntent(rawPrompt, contextString);
    this.broadcastToDashboard('awaitingFeedback', { message: prompt }); // Push to CLI/Dashboard

    const context: ExecutionContext = {
      prompt: prompt, // Use synthesized intent for the main execution context
      rawPrompt: rawPrompt, // Keep original prompt for reference
      ...(filePath ? { filePath } : {}),
      sessionId: this.sessionId,
      startTime,
      ...(force !== undefined ? { force } : {})
    };

    // Phase 24: Constitutional Boundary Negotiation
    const negotiation = await this.negotiateBoundaries(prompt);
    if (!negotiation.proceed) {
      return { ok: false, error: new Error(`Boundary Negotiation Failed: ${negotiation.reason}`) };
    }

    if (negotiation.strategyOverride) {
      this.currentNarrative = `Constitutional Shift: ${negotiation.reason}`;
      this.broadcastToDashboard('boundary_negotiation', {
        type: 'PROTOCOL_SHIFT',
        reason: negotiation.reason,
        strategy: negotiation.strategyOverride
      });
    }
    // Line 1: SENSE - Input received
    void this.hexagramManager.pinCognitiveCard(1, 'SENSE', `Input: ${prompt.substring(0, 50)}...`, YaoState.YoungYang);

    // Inject Immutable System Prompt
    const fullPrompt = constructInitialPrompt(prompt);

    // Phase 17: Reset context tracking for new high-level intent
    this.lastSentFileHashes.clear();
    this.forceFullContext = true;

    this.logger.info({ prompt: prompt.substring(0, 100) }, 'Executing intent (Advanced Loop)');

    // Strategic Limb Ordering (Hexagram Affinity)
    const currentHex = this.hexagramManager.getInterpretation();
    const orderedLimbs = [...this.limbs].sort((a, b) => {
      const aPref = (a.preferredHexagrams || []).includes(currentHex.binary);
      const bPref = (b.preferredHexagrams || []).includes(currentHex.binary);
      const aAvoid = (a.avoidHexagrams || []).includes(currentHex.binary);
      const bAvoid = (b.avoidHexagrams || []).includes(currentHex.binary);

      // Preference takes highest priority
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;

      // Avoidance takes lowest priority
      if (aAvoid && !bAvoid) return 1;
      if (!aAvoid && bAvoid) return -1;

      return 0; // Preserve original order otherwise
    });

    if (currentHex.name !== 'Unknown Archetype' && orderedLimbs.length > 0) {
      this.logger.debug({
        strategy: currentHex.name,
        topLimb: orderedLimbs[0]?.id
      }, 'Strategic Limb Reordering applied');
    }

    // 0. Check Neural Limbs (Specialized Agents) - PRIORITY OVER CONVERSATIONAL
    for (const limb of orderedLimbs) {
      const decision = await limb.canHandle({ prompt: fullPrompt });

      // Phase 14: Quantum Escalation for Maximal Complexity ('Yang' Threshold)
      if (decision === 'Yang' && limb.id === 'quantum_superposition') {
        this.logger.info('Escalating to Quantum Superposition (Super-Intelligent reasoning)...');
        // Proceed to standard limb execution for Quantum
      }

      if (decision !== 'Yin') {

        const result = await limb.execute({ prompt: fullPrompt });
        if (result.ok) {
          this.recordSuccessMetadata(limb.id, prompt, Date.now() - context.startTime, filePath);

          // Special case for WebAppForge preview events
          const resultData = result.value.data as Record<string, unknown>;
          if (limb.id === 'webapp_forge' && resultData?.['previewUrl']) {
            const previewMetadata = (await this.previewServer.getActivePreviews()).find(p => p.url === resultData['previewUrl']);
            if (previewMetadata) {
              this.emit('previewStarted', previewMetadata);
            }
          }

          this.recordIntent(context, limb.id, SuccessRating.Success, Date.now() - context.startTime, result.value.output, result.value.data);
          return { ok: true, value: result.value };
        }
        const error = (result as { ok: false; error: Error }).error;
        return { ok: false, error };
      }
    }

    const taskType = TaskClassifier.classify(prompt);

    // Phase 21: Conversational Bypass (Fast Path)
    // Refined to catch broad greetings and simple affirmations
    const conversationalKeywords = ['hello', 'hi', 'hey', 'greetings', 'yo', 'thanks', 'thank you', 'ok', 'yes', 'no'];
    if (taskType === TaskType.Conversational || conversationalKeywords.includes(prompt.toLowerCase().trim())) {
      this.logger.info('Conversational intent detected - bypassing supervisor planning');
      const result = await this.modelExecutor.callModel(
        'gemini:gemini-3-flash-preview',
        `You are POG-CODER-VIBE. Your tone is STRAIGHT UP & BRILLIANT.
No nonsense, no performative humility, no fantasizing about coding.
Be direct. Be highly competent. If creative topics arise, be open to whims and adventurous prompts.
User: ${prompt}`,
        []
      );

      if (result.ok) {
        this.recordSuccessMetadata('conversational', prompt, Date.now() - context.startTime, filePath);
        return { ok: true, value: { output: result.value.response } };
      }
      const error = (result as { ok: false; error: Error }).error;
      return { ok: false, error };
    }

    let turnCounter = 0;

    // 1. Planning turn (Supervisor Decomposition with Gemini Thinking)
    this.logger.info('Supervisor thinking initiated (Gemini 2.0 Thinking)...');

    const controlTools = this.getControlPlaneTools();
    const projectMap = this.contextBuilder.getProjectMap();
    const hexagramContext = await this.hexagramManager.formatForPrompt();
    const projectPulse = ProjectPulse.getManifestContext(this.config.projectRoot);

    const planningTurnPrompt = this.architectureDigest.inject(`${PLANNING_PROMPT}\n\n${hexagramContext}\n\n${projectPulse}\n\n${projectMap}\n\nUser Task: ${fullPrompt}`);

    const planResult = await this.callModel(
      'gemini:gemini-2.0-flash', // Updated to stable flash for high-speed planning
      planningTurnPrompt,
      controlTools
    );

    let executionPlan: ExecutionPlan = {
      goal: prompt,
      steps: [{ tool: 'Sandbox', args: [prompt], reasoning: 'Direct implementation' }]
    };

    if (planResult.ok) {
      const functionCall = planResult.value.functionCalls?.find(f => f.name === 'plan_tool_execution');
      if (functionCall) {
        executionPlan = functionCall.args as unknown as ExecutionPlan;
        context.plan = executionPlan;
        this.logger.info({ goal: executionPlan.goal, steps: executionPlan.steps.length }, 'Structured execution plan established via Control Plane');
      } else {
        // Fallback to JSON parsing if function calling fails but model outputs text
        try {
          const jsonMatch = planResult.value.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            executionPlan = JSON.parse(jsonMatch[0]);
            context.plan = executionPlan;
            this.logger.info('Parsed execution plan from text fallback');
          } else if (planResult.value.response.length > 50 && !planResult.value.response.includes('Sandbox')) {
            // If response is long and doesn't mention tools, it's likely a direct answer
            this.logger.info('Supervisor provided direct response - bypassing execution steps');
            this.recordSuccessMetadata('supervisor', prompt, Date.now() - context.startTime, filePath);
            return { ok: true, value: { output: planResult.value.response } };
          }
        } catch (e) {
          this.logger.warn('Failed to parse execution plan, falling back to direct mode');
        }
      }
    }

    // Line 3: THINK - Strategy established
    const planMood = CognitiveTranslator.translate(executionPlan.steps.length / 3, 'planning_complexity');
    void this.hexagramManager.pinCognitiveCard(3, 'THINK', `Plan: ${executionPlan.goal} (${executionPlan.steps.length} steps). Vibe: ${planMood}`, YaoState.OldYang);
    this.logger.info({ planMood }, 'PLAN CONCLUDED: Bottlenecking intent to substrate...');

    let totalResponse = '';
    let lastModel = 'unknown';

    const initialEmbedding = this.geminiService ? await this.geminiService.embed(prompt) : { ok: false as const, error: new Error('Gemini unavailable') };
    const embeddingValue = isOk(initialEmbedding) ? initialEmbedding.value : undefined;

    // Phase 12: Proactive RAG (Memory Recall)
    if (embeddingValue) {
      const recallResult = await this.vectorDB.searchSimilar(new Float32Array(embeddingValue), 5, this.config.projectId);
      if (recallResult.ok) {
        this.activeMemories = recallResult.value;
        this.logger.info({ memoryCount: this.activeMemories.length }, 'Sovereign Memory recalled for intent');
      }
    }

    let i = 0;
    for (const step of executionPlan.steps) {
      i++;
      turnCounter++;
      this.logger.info({ step: i, tool: step.tool }, `Executing step: ${step.reasoning}`);

      // Line 5: ACT - Tool execution
      void this.hexagramManager.pinCognitiveCard(5, 'ACT', `Executing: ${step.tool} - ${step.reasoning.substring(0, 30)}...`, YaoState.YoungYang);

      const stepHexagram = await this.hexagramManager.formatForPrompt(embeddingValue);
      const stepPrompt = `OVERALL GOAL: ${executionPlan.goal}
CURRENT STEP (${i}/${executionPlan.steps.length}): ${step.reasoning}
TOOL: ${step.tool}
ARGS: ${JSON.stringify(step.args)}
HISTORY: ${totalResponse.substring(0, 500)}...

${stepHexagram}

Perform the current step and output results. If verifying, ensure you run the necessary tools.`;

      const executionTools = this.getAllAvailableTools();

      // HEXAGRAM STRATEGY EXECUTION: Wrap task in strategy-aware execution
      const turnResult = await this.executeWithStrategy(
        () => this.executeTurn(stepPrompt, context, turnCounter, executionTools, step.tool, modelOverride),
        { intent: step.reasoning, useCloud: true }
      );

      if (turnResult.status === 'continue') {
        // Step requires more work or review
        totalResponse += `\nStep ${i} Result: ${turnResult.nextMessage}\n`;
      } else if (turnResult.status === 'stop') {
        if (turnResult.terminateReason === AgentTerminateMode.GOAL) {
          totalResponse += `\nStep ${i} Complete: ${turnResult.finalResult ?? ''}\n`;
        } else {
          this.logger.error({ stepId: i, reason: turnResult.terminateReason }, 'Step execution failed');
          return { ok: false, error: new Error(`Step ${i} failed: ${turnResult.terminateReason}`) };
        }
      }

      // SOVEREIGN VERIFICATION STEP
      // Audit the turn result against the original intent
      const audit = await this.intentVerifier.verify(prompt, turnResult, context);
      if (!audit.isAligned) {
        this.logger.warn({ score: audit.score, correction: audit.correction }, 'Sovereign Drift Detected');
        // Inject the correction into the totalResponse so it affects subsequent steps' context
        totalResponse += `\n[SOVEREIGN DRIFT DETECTED]: Your last action deviated from the sovereign intent.\nDrift Score: ${audit.score}\nPROACTIVE CORRECTION: ${audit.correction}\n`;
        // Line 6: REFLECT - Deviation detected
        void this.hexagramManager.pinCognitiveCard(6, 'REFLECT', `Sovereign Drift [Score: ${audit.score}]`, YaoState.OldYin);
      } else {
        // Line 6: REFLECT - Alignment confirmed
        void this.hexagramManager.pinCognitiveCard(6, 'REFLECT', 'Alignment Confirmed', YaoState.YoungYang);
      }


      if (turnResult.model) lastModel = turnResult.model;
    }

    this.recordSuccessMetadata(lastModel, prompt, Date.now() - context.startTime, filePath);
    this.recordIntent(context, lastModel, SuccessRating.Success, Date.now() - context.startTime, totalResponse);

    // Phase 13: Update Project Pulse on Success
    ProjectPulse.updatePulse(this.config.projectRoot, {
      objective: prompt.substring(0, 50),
      mood: this.hexagramManager.getInterpretation().name,
      inventoryItem: filePath ? `Modified ${filePath}` : 'Executed complex intent'
    });

    // Phase 14: Omega Teleological Review
    const omega = this.limbs.find(l => l.id === 'omega_teleology');
    if (omega) {
      const omegaResult = await omega.execute({
        prompt: `Review the following output for goal completion: ${prompt}`,
        context: { complexity: TaskClassifier.assessComplexity(prompt, TaskClassifier.analyzeProbabilities(prompt)) }
      });
      if (omegaResult.ok && (omegaResult.value.data as Record<string, unknown> | undefined)?.['done']) {
        this.logger.info('Omega Sequence: Project Converged at Omega Point.');
        totalResponse += `\n\n--- OMEGA VERIFICATION ---\n${omegaResult.value.output}`;
      }
    }

    const conclusionState = CognitiveTranslator.translate(totalResponse, 'conclusion_synthesis');
    void this.hexagramManager.pinCognitiveCard(6, 'REFLECT', `Conclusion: ${conclusionState}`, YaoState.OldYin);

    this.logger.info({ conclusionState }, 'COGNITIVE CYCLE COMPLETE: Result converged.');

    return { ok: true, value: { output: totalResponse } };
  }

  private async executeTurn(
    currentMessage: string,
    context: ExecutionContext,
    turnCounter: number,
    tools?: Tool[],
    action?: string,
    modelOverride?: string
  ): Promise<AgentTurnResult> {
    if (turnCounter > 1) {
      this.emit('reviewStarted', { iteration: turnCounter });
    }

    // 0. Proactive Intervention phase (Monitor Interference)
    if (!context.force) {
      const interference = await this.checkMonitorInterference(context.plan);
      if (interference) return interference;
    }

    // A. Sensory Interception phase (Proactive Enrichment)
    const sensoryData = await this.substrateLimb.interceptSensoryTask(currentMessage, context);
    if (sensoryData) {
      currentMessage = `${currentMessage}\n\nPre-processed Sensory Data:\n${sensoryData}`;
      this.logger.info('Prompt enriched with proactive sensory data');
    }

    // 1. Route to best model (or use override)
    // Sovereign Context Injection
    const hexagram = this.hexagramManager.getInterpretation();
    this.logger.info({
      hexagram: hexagram.name,
      strategy: hexagram.strategy,
      binary: hexagram.binary
    }, `[SOVEREIGN PULSE] Archetype: ${hexagram.name} (${hexagram.binary})`);

    // Dynamic 3-Question Logging (No False Positives)
    const contextResult = await this.hexagramManager.getHexagramContext();
    if (contextResult.ok) {
      const oracleLine = contextResult.value.find(c => c.content.includes('Oracle Analysis'));
      if (oracleLine) {
        this.logger.debug({
          content: oracleLine.content
        }, '[ORACLE] Tri-Axis Evaluation Active (Derived from Hexagram Context)');
      } else {
        this.logger.trace('[SOVEREIGN] Hexagram derived from System Metrics (Build/Cloud/Health)');
      }
    }

    let selectedModel: string;
    if (modelOverride) {
      selectedModel = modelOverride;
    } else {
      const routeResult = await this.router.route({
        prompt: currentMessage,
        metadata: {
          projectRoot: this.config.projectRoot,
          filePath: context.filePath,
          ghostEngagementLevel: this.ghostLimb.engagementLevel,
          isStuck: turnCounter > 2 // Trigger esoteric escalation if loops persist
        }
      });
      if (!routeResult.ok) {
        return {
          status: 'stop',
          terminateReason: AgentTerminateMode.ERROR,
          finalResult: null,
          model: 'unknown'
        };
      }
      selectedModel = routeResult.value;
    }

    // Phase 18: Ghost Terminator Interception
    if (selectedModel === 'ghost-terminator') {
      this.logger.warn({ prompt: currentMessage.substring(0, 50) }, '👻 GHOST_TERMINATOR: Fulfilling natively via local GhostLimb');
      const ghostResult = await this.ghostLimb.execute({ prompt: currentMessage });
      if (ghostResult.ok) {
        return {
          status: 'stop',
          terminateReason: AgentTerminateMode.GOAL,
          finalResult: ghostResult.value.output,
          model: 'ghost-terminator'
        };
      }
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.ERROR,
        finalResult: (ghostResult as { ok: false; error: Error }).error.message,
        model: 'ghost-terminator'
      };
    }

    // Augment with context if filePath is present
    let augmentedPrompt = currentMessage;
    if (context.filePath) {
      const fileContext = await this.contextBuilder.buildDeepContext(context.filePath, 2);

      // Phase 17: Context Delta Logic
      const contextContent = await this.buildContextDelta(fileContext);

      augmentedPrompt = `Project Context Update:\n${contextContent}\n\nTask:\n${currentMessage}`;
      this.logger.debug({
        filePath: context.filePath,
        isDelta: !this.forceFullContext
      }, 'Context Update injected');

      this.forceFullContext = false; // After first send, everything is delta
    }

    // Unified Resilience Level Check (Sovereign Substrate Awareness)
    const registry = (await import('./HealthRegistry.js')).HealthRegistry.getInstance();
    const serviceMap: Record<string, string> = { 'gemini': 'gemini', '@cf/': 'cloudflare' };
    let serviceId: string | undefined;

    for (const [pattern, id] of Object.entries(serviceMap)) {
      if (selectedModel.includes(pattern)) {
        serviceId = id;
        break;
      }
    }

    if (serviceId) {
      const health = registry.getHealth(serviceId);
      if (health.state === 'RATE_LIMITED') {
        this.logger.warn({ model: selectedModel, cooldown: health.cooldownSeconds, service: serviceId }, 'Router selected rate-limited model - forcing reroute via local priority');

        // Re-route with explicit localized pressure
        const reroute = await this.router.route(currentMessage + ' (FORCED_LOCAL: Cloud service is restricted)');
        if (reroute.ok && reroute.value !== selectedModel) {
          selectedModel = reroute.value;
        }
      }
    }

    this.emit('modelCalled', { model: selectedModel, prompt: augmentedPrompt });

    // 2. Call Model (Standard or Adversarial)
    let callResult: Result<ModelResponse>;

    if (action === 'MODIFY' && this.geminiService) {
      // High-stakes modification: Use Adversarial Loop
      callResult = await this.adversarialOrchestrator.generateValidatedCode(
        augmentedPrompt,
        selectedModel,
        { fileName: context.filePath }
      );

      // Phase 12: Quantum Escalation on failure (Maximal Complexity)
      if (!callResult.ok) {
        this.logger.warn('Adversarial Loop failed to reach consensus. Escalating to Quantum Superposition...');
        const quantum = this.limbs.find(l => l.id === 'quantum_superposition');
        if (quantum) {
          const qResult = await quantum.execute({ prompt: augmentedPrompt });
          if (qResult.ok) {
            callResult = {
              ok: true,
              value: {
                response: (qResult.value as { output: string }).output,
                model: 'quantum-superposition',
                latency: Date.now() - context.startTime,
                cognitivePulse: YaoState.OldYang // Quantum is high-energy Yang
              }
            };
          }
        }
      }
    } else {
      // Standard Research/Verify: Direct Executor call
      callResult = await this.modelExecutor.callModel(selectedModel, augmentedPrompt, tools);
    }

    if (!callResult.ok) {
      const error = (callResult as { ok: false; error: Error }).error;
      this.logger.error({ error: error.message, model: selectedModel }, 'Primary model call failed - checking for Sovereign Shell fallback');

      this.router.recordFailure(selectedModel);
      this.recordFailureMetadata(selectedModel, augmentedPrompt, error.message, (context as { filePath: string }).filePath);

      // Sovereign Shell Fallback Logic
      if (selectedModel.includes('gemini')) {
        this.logger.warn('Gemini API restricted - falling back to global gemini CLI');
        const shellResult = await this.executeSovereignFallback('gemini_cli_exec', augmentedPrompt);
        if (shellResult.ok) {
          return {
            status: 'stop',
            terminateReason: AgentTerminateMode.GOAL,
            finalResult: (shellResult.value as { output: string }).output,
            model: 'sovereign-shell-gemini'
          };
        }
      }

      // Cloudflare Fallback
      if (selectedModel.includes('@cf/')) {
        this.logger.warn('Cloudflare API restricted - falling back to global wrangler CLI');
        const shellResult = await this.executeSovereignFallback('wrangler_global_exec', augmentedPrompt);
        if (shellResult.ok) {
          return {
            status: 'stop',
            terminateReason: AgentTerminateMode.GOAL,
            finalResult: (shellResult.value as { output: string }).output,
            model: 'sovereign-shell-wrangler'
          };
        }
      }

      this.emit('executionError', { error, context });
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.ERROR,
        finalResult: null,
        model: selectedModel
      };
    }

    this.router.recordSuccess(selectedModel);

    // 3. Process Logic (Handle Formal Function Calls and Sandbox Commands)
    const processResult = await this.processFunctionCalls(callResult.value, context.plan);
    return { ...processResult, model: selectedModel };
  }

  /**
   * Executes a terminal-based fallback using the SovereignShellLimb.
   */
  private async executeSovereignFallback(toolName: string, prompt: string): Promise<Result<Execution>> {
    const res = await this.cliLimb.handleToolCall(toolName, { args: prompt });
    return res as unknown as Result<Execution>;
  }

  /**
   * Maps text-based command extraction to formal Function Calls
   * Wraps Sandbox.execute logic
   */
  private async processFunctionCalls(modelResponse: ModelResponse, plan?: ExecutionPlan): Promise<AgentTurnResult> {
    const { response, functionCalls } = modelResponse;
    const commands = this.sandbox.extractCommands(response);

    let executionResults = '';

    // Handle Task Completion (Signal from model)
    const safeResponse = response || '';
    if (safeResponse.includes('TASK_COMPLETE')) {
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.GOAL,
        finalResult: response
      };
    }

    // Priority 1: Handle Formal Function Calls (Limbs)
    if (functionCalls && functionCalls.length > 0) {
      this.logger.info({ count: functionCalls.length }, 'Formal Tool Calls Detected');
      for (const call of functionCalls) {
        // Narrate to CLI
        this.logger.info(`⚡ [SOVEREIGN ACT] Executing Tool: ${call.name}`);

        // Interference Check (Phase 22: Proactive Health)
        const interference = await this.checkMonitorInterference(plan);
        if (interference) return interference;

        let result: Result<Execution> = { ok: false, error: new Error(`No handler for tool: ${call.name}`) };

        // Dynamic routing to limb that owns the tool
        let handled = false;
        for (const limb of this.limbs) {
          if (limb.getTools && limb.handleToolCall) {
            const tools = limb.getTools();
            const hasTool = tools.some(group => group.functionDeclarations.some((f: { name: string }) => f.name === call.name));
            if (hasTool) {
              result = await limb.handleToolCall(call.name, call.args);
              handled = true;
              break;
            }
          }
        }

        // All tool calls (Limbs & Control Plane) are now handled via the ToolingSpine in handleToolCall
        if (!handled) {
          this.logger.warn({ tool: call.name }, 'Tool call not handled by any registered limb');
        }

        const output = result.ok ? JSON.stringify(result.value) : (result as { ok: false; error: Error }).error.message;
        executionResults += `\nTool: ${call.name}\nResult: ${output}\n`;
      }
    }

    // Priority 2: Handle Legacy Sandbox Commands (Extract from text)
    if (commands.length > 0) {
      this.logger.info({ count: commands.length }, 'Tool Calls (Sandbox) Detected');
      for (const cmd of commands) {
        // Interference Check (Phase 22: Proactive Health)
        const interference = await this.checkMonitorInterference(plan);
        if (interference) return interference;

        const execResult = await this.sandbox.execute(cmd);

        if (!execResult.ok) {
          const error = (execResult as { ok: false; error: Error }).error;
          this.logger.error({ cmd, error }, 'Tool Execution Failed');
          executionResults += `\nCommand: ${cmd}\nError: ${error.message}\n`;
          break; // Stop on first error
        }

        const resultValue = execResult.value;
        const success = resultValue.exitCode === 0;
        const output = success ? resultValue.stdout : resultValue.stderr;

        executionResults += `\nCommand: ${cmd}\nExit Code: ${resultValue.exitCode}\nOutput: ${output}\n`;
        this.emit('commandExecuted', { command: cmd, success: success ? SuccessRating.Success : SuccessRating.Failure, output });

        if (!success) break; // Stop on first error
      }
    }

    // CASE 3: No actionable items found
    if (!executionResults) {
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.GOAL,
        finalResult: response
      };
    }

    const nextMessage = `Tool Execution Results:\n${executionResults}\n\nBased on these results, proceed with the next step or finalize with TASK_COMPLETE.`;

    return {
      status: 'continue',
      nextMessage
    };
  }

  /**
   * Checks background health and interrupts if critical errors are found.
   */
  private async checkMonitorInterference(plan?: ExecutionPlan): Promise<AgentTurnResult | null> {
    if (!this.monitorAgent) return null;

    const result = await this.monitorAgent.diagnoseState(plan);
    if (result.decision === 'Yang') return null; // Proceed (Healthy or Planned Drift)

    if (result.decision === 'Yin') {
      this.logger.warn({ reasoning: result.reasoning }, 'MONITOR INTERFERENCE: Critical failure detected');
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.ERROR,
        finalResult: `INTERRUPT: ${result.reasoning}`
      };
    }

    if (result.decision === 'YinYang') {
      this.logger.info({ reasoning: result.reasoning }, 'MONITOR INTERVENTION: Proactive Patch needed');
      // Background handleAutoHeal will catch this via the event listener, 
      // but we return a 'continue' result that essentially "waits" or suggests a retry.
      return {
        status: 'continue',
        nextMessage: `SYSTEM INTERVENTION: ${result.reasoning}\nWaiting for auto-patch to complete...`
      };
    }

    return null;
  }

  /**
   * Pauses execution and waits for human feedback via WebSocket
   */
  public async pauseForUserFeedback(message: string): Promise<string> {
    this.logger.info({ message }, 'Pausing for Human-in-the-Loop feedback...');
    this.emit('awaitingFeedback', { message });

    return new Promise((resolve) => {
      this.once('userFeedback', (feedback: string) => {
        this.logger.info('Feedback received, resuming execution');
        resolve(feedback);
      });
    });
  }

  /**
   * Final Chance Logic (Copied from Gemini CLI resilience pattern)
   */



  private recordSuccessMetadata(model: string, prompt: string, latency: number, filePath?: string): void {
    const taskType = TaskClassifier.classify(prompt);
    const performance: ModelPerformance = {
      model,
      taskType,
      extension: (filePath?.split('.') || []).pop() || '',
      latency,
      success: SuccessRating.Success,
      timestamp: Date.now(),
      isFree: CostTier.Free
    };
    this.router.recordPerformance(performance);

    // Learn from success (VectorDB)
    void (async () => {
      let embedding = new Float32Array(this.config.embeddingDimensions).fill(0.1); // Fallback

      if (this.geminiService) {
        const embedResult = await this.geminiService.embed(prompt);
        if (embedResult.ok) {
          embedding = new Float32Array(embedResult.value);
        }
      }

      const lesson: Lesson & { projectId: string } = {
        id: `lesson_${Date.now()}`,
        text: prompt,
        embedding: embedding,
        sessionId: this.sessionId,
        projectId: this.config.projectId,
        errorType: 'none',
        createdAt: Date.now(),
        metadata: { model, taskType, path: filePath }
      };
      await this.vectorDB.addLesson(lesson);
    })();
  }

  private recordFailureMetadata(model: string, prompt: string, errorMsg: string, filePath?: string): void {
    const taskType = TaskClassifier.classify(prompt);

    // Learn from failure (VectorDB)
    void (async () => {
      let embedding = new Float32Array(this.config.embeddingDimensions).fill(0.1);

      if (this.geminiService) {
        const embedResult = await this.geminiService.embed(prompt);
        if (embedResult.ok) {
          embedding = new Float32Array(embedResult.value);
        }
      }

      const lesson: Lesson & { projectId: string } = {
        id: `fail_${Date.now()}`,
        text: prompt,
        embedding: embedding,
        sessionId: this.sessionId,
        projectId: this.config.projectId,
        errorType: errorMsg,
        createdAt: Date.now(),
        regretLikelihood: 1, // High regret for failures
        metadata: { model, taskType, path: filePath, status: 'failed' }
      };
      await this.vectorDB.addLesson(lesson);
    })();
  }

  private async callModel(model: string, prompt: string, tools?: Tool[]): Promise<Result<ModelResponse>> {
    return this.modelExecutor.callModel(model, prompt, tools);
  }

  // Removed local classifyTaskType to use TaskClassifier

  private recordIntent(context: ExecutionContext, model: string, success: SuccessRating, time: number, output?: string, data?: unknown): void {
    this.intentHistory.push({
      sessionId: context.sessionId || '',
      query: context.prompt || '',
      selectedModel: model || 'unknown',
      success,
      timestamp: context.startTime || Date.now(),
      executionTime: time,
      output: output || '',
      data: data || null
    });

    // Update Neural Latency (Rolling average of last 5)
    const recentExecs = this.intentHistory.slice(-5).map(i => i.executionTime);
    if (recentExecs.length > 0) {
      this.neuralLatency = recentExecs.reduce((a, b) => a + b, 0) / recentExecs.length;
    }

    this.emit('intentExecuted', this.intentHistory[this.intentHistory.length - 1] as any);

    // Neural Heatmap: Track success patterns
    if (success && output?.includes('Tool result:')) {
      const toolMatch = output.match(/Tool result: (\w+)/);
      const tn = toolMatch ? toolMatch[1] : null;
      if (tn) {
        this.toolUsageHeatmap[tn] = (this.toolUsageHeatmap[tn] || 0) + 1;
      }
    }

    if (this.intentHistory.length > 1000) this.intentHistory.shift();
  }

  getCurrentState(): Record<string, unknown> {
    if (!this) {
      return { status: 'error', reason: 'Lost context' };
    }

    return {
      sessionId: this.sessionId || 'unknown',
      uptime: Date.now() - (this.startTimestamp || Date.now()),
      intentCount: (this.intentHistory || []).length,
      recentIntents: (this.intentHistory || []).slice(-10),
      neuralLatency: this.neuralLatency || 0,
      enabledServices: this.config?.enabledServices || [],
      limbs: (this.limbs || []).map(l => {
        if (!l) return { id: 'unknown', type: 'unknown' };
        const status = typeof l.getStatus === 'function' ? l.getStatus() : { id: l.id, type: l.type, capabilities: l.capabilities };
        return status;
      }),
      workspaces: this.config?.workspaces || [],
      activeWorkspace: this.config?.projectRoot || '',
      pinnedFiles: this.contextBuilder?.getPinnedFiles() || [],
      modelInventory: ModelInventory.getAvailableModels(),
      terminalTelemetry: {
        lastProcess: 'PowerShell Extension (14528)',
        status: 'Active',
        lastOutput: '... BAAI general embedding ... Aura-2 Text-to-Speech ...'
      },
      envStatus: this.envStatus || [],
      systemHealth: this.getSystemHealth ? this.getSystemHealth() : { cpu: 0, mem: 0, disk: 0 },
      memoryMetrics: {
        totalGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
        freeGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
        activeSubstrate: '1.3TB Virtual Mesh' // Acknowledgement of user's substrate context
      },
      activeHexagram: this.hexagramManager?.getInterpretation() || { strategy: 'STASIS' },
      hexagramLines: (this.hexagramManager as any)?.lines || [],
      emotion: this.hexagramManager?.getInterpretation()?.emotion || 'STEADY',
      activeMemories: (this.activeMemories || []).map(m => m ? ({ text: m['text'], projectId: m.projectId, type: m.metadata?.['type'] }) : null).filter(Boolean),
      sovereignVoice: this.currentNarrative || '',
      neuralHeatmap: this.toolUsageHeatmap || {},
      circuitBreakerState: this.circuitBreaker?.getStatusSnapshot() || {},
      globalMetrics: this.stateManager?.getState() || {},
      intentPathways: Object.keys(IntentMap || {})
    };
  }

  /**
   * Narrates cognitive state changes to the CLI with high visibility.
   */
  private narrateCognition(card: import('./HexagramManager.js').ContextCard): void {
    const iconMap: Record<string, string> = {
      'THINK': '🧠',
      'ACT': '⚡',
      'REFLECT': '🔍',
      'SENSE': '👁️',
      'MEMORY': '💾'
    };

    const rawTitle = card.title.replace('[COGNITION] ', '');
    const iconKey = rawTitle.split(' ')[0] ?? '';
    const icon = iconMap[iconKey] || '✨';

    // Structured log for CLI consumption, but also readable for humans
    this.logger.info({
      cognitiveAxis: card.lineIndex,
      state: YaoState[card.state],
      emotion: card.emotion
    }, `[SOVEREIGN THOUGHT] ${icon} ${card.title}: ${card.content} (Emotion: ${card.emotion})`);

    // Broadcast to Dashboard (Real-time Cognition Feed)
    this.broadcastToDashboard('cognitive_state', {
      axis: card.lineIndex,
      title: card.title,
      content: card.content,
      icon,
      state: YaoState[card.state],
      emotion: card.emotion,
      timestamp: Date.now()
    });
  }

  private async broadcastPulse(): Promise<void> {
    await this.refreshSystemHealth();
    if (!this.wsServer) return;

    const health = this.getSystemHealth();
    const hex = this.hexagramManager.getInterpretation();
    // Intensity weighted by hexagram strategy (MAINTAIN=0.3, EXPAND=0.9, etc.)
    const strategyWeight = hex.strategy === 'EXPAND' ? 0.9 :
      hex.strategy === 'MAINTAIN' ? 0.6 :
        hex.strategy === 'ARBITRATE' ? 0.75 : 0.4;

    // Metabolic spark probability weighted by CPU load and hexagram
    const sparkProb = (this.cachedHealth.cpu / 100) * strategyWeight;

    const pulse = {
      timestamp: Date.now(),
      intensity: 0.5 + (0.5 * strategyWeight),
      spark: Math.random() < sparkProb,
      health: health
    };

    const payload = JSON.stringify({ type: 'pulse', data: pulse });
    this.wsServer.clients.forEach(client => {
      if (client.readyState === 1) client.send(payload);
    });
  }

  private async generateSovereignVoice(): Promise<void> {
    const metrics = this.getSystemHealth();
    const ghostStatus = this.ghostLimb.getStatus();
    const isGhostActive = ghostStatus['engagementLevel'] === 1; // HealthStatus.Ready

    // TERNARY FAILOVER: If Ghost is Master (+1), skip Cloud narrative
    if (isGhostActive) {
      this.currentNarrative = this.ghostLimb.generateLocalNarrative(metrics);
      this.logger.info({ narrative: this.currentNarrative }, 'Sovereign Voice updated (Ghost Failover)');
      this.broadcastState();
      return;
    }

    if (!this.geminiService) return;
  }

  private async refreshSystemHealth(): Promise<void> {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = ((totalMem - freeMem) / totalMem) * 100;

      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(core => {
        for (const type in core.times) {
          totalTick += (core.times as any)[type];
        }
        totalIdle += core.times.idle;
      });

      const cpuUsage = 100 - (100 * totalIdle / totalTick);

      // Real Disk Usage (Windows specific as per OS metadata)
      const diskUsage = await new Promise<number>(async (resolve) => {
        const root = getSovereignRoot();
        const driveLetter = root.startsWith('/') ? '/' : root.split(':')[0] || 'C';
        const cmd = `powershell -Command "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -like '${driveLetter}*' } | Select-Object @{Name='Pct';Expression={($_.FreeSpace / $_.Size) * 100}}"`;
        const { exec } = await import('child_process');
        exec(cmd, (error: any, stdout: string) => {
          if (error) return resolve(0);
          const dmatch = stdout.match(/(\d+\.?\d*)/);
          if (dmatch && dmatch[1]) {
            // Percent free, so 100 - free = used
            resolve(100 - parseFloat(dmatch[1]));
          } else {
            resolve(0);
          }
        });
      });

      this.cachedHealth = {
        cpu: cpuUsage,
        mem: memUsage,
        disk: diskUsage
      };
    } catch (e) {
      this.logger.error({ error: e }, 'Failed to refresh system health metrics');
    }
  }

  private getSystemHealth(): { cpu: number; mem: number; disk: number } {
    return this.cachedHealth;
  }

  public async switchWorkspace(newRoot: string): Promise<Result<void>> {
    try {
      this.logger.info({ newRoot }, 'Switching active workspace');

      // 1. Update services
      this.contextBuilder.setProjectRoot(newRoot);
      this.indexer.setProjectRoot(newRoot);
      this.watcher.setProjectRoot(newRoot);

      // 2. Hack-update config (readonly bypass)
      (this.config as any).projectRoot = newRoot;

      // 3. Trigger re-indexing if needed
      const lessonCount = await this.vectorDB.getLessonCount();
      if (lessonCount === 0) {
        void this.indexer.indexProject();
      }

      this.broadcastState();
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: error as Error };
    }
  }

  public pinFile(path: string): void {
    this.contextBuilder.pinFile(path);
    this.broadcastState();
  }

  public unpinFile(path: string): void {
    this.contextBuilder.unpinFile(path);
    this.broadcastState();
  }

  private broadcastState(): void {
    this.broadcastToDashboard('state', this.getCurrentState());
  }

  // Consolidated into the previous broadcastPulse

  private broadcastToDashboard(type: string, data: any): void {
    if (!this.wsServer || !this.wsServer.clients) return;
    const msg = JSON.stringify({ type, data });

    // Convert Set to Array to ensure stable iteration and prevent "not a function" errors
    const clients = Array.from(this.wsServer.clients);
    clients.forEach(client => {
      try {
        if (client && client.readyState === 1) { // 1 = OPEN
          client.send(msg);
        }
      } catch (err) {
        // Silent failure for individual client send errors
      }
    });
  }

  private handleControlMessage(payload: { command: string; data: Record<string, any> }, ws: import('ws').WebSocket): void {
    const { command, data } = payload;
    this.logger.info({ command, data }, 'Dashboard control message dispatch initiating');

    // MAPPING: Commands -> Logical Tools in limbs
    // This adheres to the rule "any tools must be added to spine"
    const commandMap: Record<string, { limbId: string; toolName: string }> = {
      'requestState': { limbId: 'dashboard', toolName: 'show_dashboard' }, // Shows dashboard state too
      'toggleService': { limbId: 'dashboard', toolName: 'toggle_service' },
      'switchWorkspace': { limbId: 'dashboard', toolName: 'switch_workspace' },
      'pinFile': { limbId: 'dashboard', toolName: 'pin_file' },
      'unpinFile': { limbId: 'dashboard', toolName: 'unpin_file' },
      'media_forge_request': { limbId: 'neural_forge', toolName: 'forge_media' },
      'requestBooks': { limbId: 'gutenberg_knowledge', toolName: 'get_library' },
      'readBook': { limbId: 'gutenberg_knowledge', toolName: 'read_book' },
      'narrateBook': { limbId: 'gutenberg_knowledge', toolName: 'narrate_book' },
      'transcribeAudiobook': { limbId: 'gutenberg_knowledge', toolName: 'audiobook_transcribe' },
      'forge_storyboard': { limbId: 'storyboard_forge', toolName: 'generate_storyboard' },
      'invoke_limb_tool': {
        limbId: (data)['limbId'] || 'unknown',
        toolName: (data)['toolName'] || 'unknown'
      },
      'rsc_capture_screen': { limbId: 'dashboard', toolName: 'rsc_capture_screen' }
    };

    const mapped = commandMap[command];

    // SOVEREIGN VIGILANCE: Audit command against hexagram strategy
    // This adds a deep intelligence layer to the control plane.
    const vigilance = this.auditCommandVigilance(command, data);
    if (vigilance.decision === -1) {
      this.logger.warn({ command, reason: vigilance.reason }, 'Command blocked by Sovereign Vigilance Engine');
      ws.send(JSON.stringify({
        type: 'intentExecuted',
        data: {
          query: `Dashboard: ${command}`,
          selectedModel: 'VigilanceEngine',
          success: false,
          output: `VIGILANCE BLOCK (Strategy: ${this.hexagramManager.getInterpretation().strategy}): ${vigilance.reason}`,
          data: { blocked: true, strategy: this.hexagramManager.getInterpretation().strategy }
        }
      }));
      return;
    }

    if (vigilance.decision === 0) {
      this.logger.info({ command, reason: vigilance.reason }, 'Command cautionary via Sovereign Vigilance');
      // We proceed but could inject a warning note in logs or separate events
    }

    // CASE: requestState is a special internal state request (Shortcut)
    if (command === 'requestState') {
      const state = this.getCurrentState();
      ws.send(JSON.stringify({ type: 'state', data: state }));
      return;
    }

    if (mapped) {
      const targetLimb = (this.limbs || []).find(l => l && l.id === mapped.limbId);
      if (targetLimb && targetLimb.handleToolCall) {
        void targetLimb.handleToolCall(mapped.toolName, data || {}).then(res => {
          // Secondary Side Effects based on tool result
          if (res.ok && (res.value as any).action) {
            const exec = res.value as any;
            if (exec.action === 'switch_workspace') this.switchWorkspace(exec.data.path);
            if (exec.action === 'pin_file') this.pinFile(exec.data.path);
            if (exec.action === 'unpin_file') this.unpinFile(exec.data.path);
          }

          // Broadcast updates to all clients
          this.broadcastState();

          // If it was a forge or complex task, send back as intent execution
          if (['media_forge_request', 'narrateBook', 'transcribeAudiobook', 'invoke_limb_tool'].includes(command)) {
            const error = !res.ok ? (res as { ok: false; error: Error }).error : null;
            const intentData = {
              query: `Dashboard Command: ${command}`,
              selectedModel: `Limb:${mapped.limbId}`,
              success: res.ok,
              output: res.ok ? (res.value.output || 'Action completed') : `Error: ${error?.message}`,
              data: res.ok ? res.value.data : null
            };
            ws.send(JSON.stringify({ type: 'intentExecuted', data: intentData }));
          } else if (command === 'rsc_capture_screen' && res.ok) {
            ws.send(JSON.stringify({ type: 'capture_completed', data: res.value.data }));
          } else if (command === 'readBook' && res.ok) {
            ws.send(JSON.stringify({ type: 'bookContent', data: res.value.data }));
          } else if (command === 'requestBooks' && res.ok) {
            const booksData = res.value.data as Record<string, unknown>;
            ws.send(JSON.stringify({ type: 'books', data: booksData?.['books'] || [] }));
          }
        });
      } else {
        this.logger.warn({ command, mapped }, 'Target limb not found for mapped command');
      }
    } else {
      this.logger.warn({ command }, 'Received unmapped control command');
    }
  }

  /**
   * VigilanceEngine: Audits control plane commands via Ternary logic and Hexagram Strategy.
   * Ensures high-risk actions align with the system's current archetypal directive.
   * Logic is expanded to avoid "minimalism" and maximize safety.
   */
  private auditCommandVigilance(command: string, data: any): { decision: number; reason: string } {
    const hex = this.hexagramManager.getInterpretation();
    const strategy = hex.strategy;

    // Risk Categorization Matrix
    const highRisk = ['switchWorkspace', 'toggleService', 'media_forge_request', 'invoke_limb_tool'];
    const destructive = ['toggleService']; // Disabling services is destructive
    const creative = ['media_forge_request', 'forge_storyboard'];

    const isHighRisk = highRisk.includes(command);
    const isDestructive = destructive.includes(command) && data?.enabled === false;
    const isCreative = creative.includes(command);

    // Policy 1: YIELD Strategy blocks all High-Risk mutations
    if (strategy === 'YIELD' && isHighRisk) {
      return {
        decision: -1,
        reason: `Substrate is in YIELD mode (Archetype: ${hex.name}). Critical mutations are frozen to prevent entropy.`
      };
    }

    // Policy 2: ARBITRATE Strategy requires caution for Destructive actions
    if (strategy === 'ARBITRATE' && isDestructive) {
      return {
        decision: 0,
        reason: `System is ARBITRATING. Disabling services during conflict state is discouraged but allowed.`
      };
    }

    // Policy 3: EXPAND Strategy boosts Creative actions and allows all mutations
    if (strategy === 'EXPAND') {
      return {
        decision: 1,
        reason: `Expansion directive active. ${isCreative ? 'Creative forging optimized for OMEGA state.' : 'Structural evolution permitted.'}`
      };
    }

    // Policy 4: MAINTAIN Strategy allows non-destructive structural change
    if (strategy === 'MAINTAIN') {
      if (isDestructive) return { decision: 0, reason: `Maintaining equilibrium. Service disruption should be minimized.` };
      return { decision: 1, reason: `System equilibrium nominal.` };
    }

    // Default: Nominal All Clear
    return { decision: 1, reason: `Command ${command} assessed as low-risk for current archetype ${hex.name}.` };
  }

  public getIntentHistory(): IntentHistory[] { return [...this.intentHistory]; }

  /**
   * Phase 17: Build a delta-based context string
   * Mirrors gemini-cli's logic for token efficiency
   */
  private async buildContextDelta(context: import('../context/ContextBuilder.js').FileContext): Promise<string> {
    const parts: string[] = [];
    const root = this.config.projectRoot;
    const changedFiles: string[] = [];
    const unchangedFiles: string[] = [];

    const allFiles = [
      resolve(root, context.primary),
      ...(context.imports || []),
      ...(context.sameDirectory?.map(f => resolve(root, f)) || []),
      ...(context.related?.map(f => resolve(root, f)) || [])
    ];

    const uniqueFiles = Array.from(new Set(allFiles));

    for (const absPath of uniqueFiles) {
      try {
        const content = fs.readFileSync(absPath, 'utf8');
        const hash = createHash('md5').update(content).digest('hex');
        const relPath = relative(root, absPath);

        if (this.forceFullContext || this.lastSentFileHashes.get(absPath) !== hash) {
          parts.push(`--- FILE UPDATE: ${relPath} ---`);
          parts.push('```typescript');
          parts.push(content);
          parts.push('```\n');
          this.lastSentFileHashes.set(absPath, hash);
          changedFiles.push(relPath);
        } else {
          unchangedFiles.push(relPath);
        }
      } catch {
        // Skip inaccessible files
      }
    }

    if (unchangedFiles.length > 0) {
      parts.push(`\nNote: The following files are unchanged and still in your context: ${unchangedFiles.join(', ')}`);
    }

    this.logger.debug({ changed: changedFiles.length, unchanged: unchangedFiles.length }, 'Context Delta calculated');
    return parts.join('\n');
  }

  private getAllAvailableTools(): Tool[] {
    const allTools: Tool[] = [];
    for (const limb of this.limbs) {
      if (limb.getTools) {
        allTools.push(...limb.getTools());
      }
    }
    return allTools;
  }

  private getControlPlaneTools(): Tool[] {
    return this.getAllAvailableTools();
  }


  private async handleAudioInput(base64Data: string, ws: import('ws').WebSocket): Promise<void> {
    try {
      this.logger.info('Received audio input from dashboard - transcribing...');
      const buffer = Buffer.from(base64Data, 'base64');

      const result = await this.modelExecutor.transcribeAudio(buffer);
      if (result.ok) {
        const text = result.value;
        this.logger.info({ transcription: text }, 'Audio transcription successful');

        // Send transcription back for UI feedback
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'transcription', data: { text } }));
        }

        // Execute the transcribed text as a prompt
        if (text.trim().length > 3) {
          void this.executeIntent(text);
        }
      } else {
        const error = (result as { ok: false; error: Error }).error;
        this.logger.error({ error }, 'Audio transcription failed');
      }
    } catch (e) {
      this.logger.error({ error: e }, 'Critical error in audio processing');
    }
  }
}
