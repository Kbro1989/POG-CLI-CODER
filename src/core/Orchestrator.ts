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
import pino from 'pino';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

import { Tool, Type } from '@google/genai';

import {
  type Result,
  type IntentHistory,
  type VibeConfig,
  TaskType,
  type ModelPerformance,
  type Lesson,
  type AgentTurnResult,
  AgentTerminateMode,
  isErr,
  type ModelResponse
} from './models.js';
import { FreeModelRouter } from './Router.js';
import { ASTWatcher } from '../watcher/ASTWatcher.js';
import { VectorDB } from '../learning/VectorDB.js';
import { Sandbox } from '../sandbox/Sandbox.js';
import { GeminiService } from './GeminiService.js';
import { KeyVault } from '../utils/KeyVault.js';
import { WebAppForgeLimb } from '../limbs/webapp/WebAppForgeLimb.js';
import { MediaForgeLimb } from '../limbs/media/MediaForgeLimb.js';
import { BioIntelligenceLimb } from '../limbs/bio/BioIntelligenceLimb.js';
import { GutenbergLimb } from '../limbs/gutenberg/GutenbergLimb.js';
import { constructInitialPrompt, PLANNING_PROMPT } from './SystemPrompts.js';
import { ContextBuilder } from '../context/ContextBuilder.js';
import { CodebaseIndexer } from '../learning/CodebaseIndexer.js';
import { ModelExecutor } from './ModelExecutor.js';
import { ValidationSystem } from './validation/ValidationSystem.js';
import { NoMockValidator } from './validation/NoMockValidator.js';
import { ArchitecturalValidator } from './validation/ArchitecturalValidator.js';
import { AdversarialOrchestrator } from './AdversarialOrchestrator.js';
import { ArchitectureDigest } from './ArchitectureDigest.js';
import { PreviewServer, PreviewMetadata } from './PreviewServer.js';
import { HexagramManager } from './HexagramManager.js';
import { HexagramLimb } from '../limbs/core/HexagramLimb.js';
import { MonitorAgent } from '../monitor/MonitorAgent.js';
import { AILimb } from '../api/ai/AILimb.js';

// Note: Component logger is initialized in the constructor for dynamic identity.

function expandTilde(path: string): string {
  if (path.startsWith('~')) {
    return join(homedir(), path.slice(1));
  }
  return path;
}

interface ExecutionStep {
  readonly id: number;
  readonly description: string;
  readonly action: 'RESEARCH' | 'MODIFY' | 'VERIFY';
}


interface ExecutionPlan {
  readonly goal: string;
  readonly steps: ReadonlyArray<ExecutionStep>;
}

interface ExecutionContext {
  readonly prompt: string;
  readonly filePath?: string;
  readonly sessionId: string;
  readonly startTime: number;
  plan?: ExecutionPlan;
  currentStepId?: number;
}

export interface OrchestratorEvents {
  intentExecuted: (data: IntentHistory) => void;
  modelCalled: (data: { model: string; prompt: string }) => void;
  executionError: (data: { error: Error; context: ExecutionContext }) => void;
  snapshotCreated: (data: { snapshotId: string; reason: string }) => void;
  commandExecuted: (data: { command: string; success: boolean; output: string }) => void;
  reviewStarted: (data: { iteration: number }) => void;
  previewStarted: (data: PreviewMetadata) => void;
  preview_log: (data: { projectName: string; stream: 'stdout' | 'stderr'; text: string }) => void;
  preview_exit: (data: { projectName: string; code: number | null }) => void;
  awaitingFeedback: (data: { message: string }) => void;
  userFeedback: (feedback: string) => void;
}

export class FreeOrchestrator extends EventEmitter {
  private readonly router: FreeModelRouter;
  private geminiService?: GeminiService;
  private readonly sessionId: string;
  private readonly intentHistory: IntentHistory[] = [];
  private wsServer?: import('ws').WebSocketServer;
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
  private readonly aiLimb: AILimb;
  private readonly mediaForgeLimb: MediaForgeLimb;
  private readonly bioIntelligenceLimb: BioIntelligenceLimb;
  private readonly gutenbergLimb: GutenbergLimb;
  private lastSentFileHashes: Map<string, string> = new Map();
  private forceFullContext = true;


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
      base: { hostname: 'POG-VIBE', projectId: config.projectId }
    });

    // Initialize Preview Server
    this.previewServer = new PreviewServer();
    this.webAppForgeLimb = new WebAppForgeLimb(config, this.previewServer);

    // Initialize Hexagram Context System
    this.hexagramManager = new HexagramManager(this.vectorDB, config.projectId);
    this.hexagramLimb = new HexagramLimb(this.hexagramManager);

    // Initialize specialized Esoteric Limbs (Phase 19)
    this.mediaForgeLimb = new MediaForgeLimb(config);
    this.bioIntelligenceLimb = new BioIntelligenceLimb(config);

    // Initialize Knowledge Limbs (Phase 20)
    this.gutenbergLimb = new GutenbergLimb();

    // Initialize AI Dispatcher Limb
    this.aiLimb = new AILimb(config);

    // Initialize KeyVault for API key rotation
    const keyVault = new KeyVault();

    // Initialize Gemini Service with KeyVault support
    const apiKey = process.env['GOOGLE_API_KEY'];
    if (apiKey) {
      try {
        keyVault.addKey('default', apiKey);
      } catch {
        // Key already exists
      }
      this.geminiService = new GeminiService({ apiKey }, keyVault);
    }

    // Initialize Router *after* GeminiService
    this.router = new FreeModelRouter(config, this.geminiService);

    // Initialize ContextBuilder for RAG-enhanced coding
    this.contextBuilder = new ContextBuilder(vectorDB, config.projectRoot, this.geminiService);

    // Initialize Indexer for background updates
    this.indexer = new CodebaseIndexer(vectorDB, this.geminiService, config.projectRoot);

    // Initialize Core Services
    this.modelExecutor = new ModelExecutor(config, this.geminiService);
    this.architectureDigest = new ArchitectureDigest(config.projectRoot);

    // Initialize Validation Stack
    this.validationSystem = new ValidationSystem([
      new NoMockValidator(),
      new ArchitecturalValidator(this.architectureDigest.getManifest())
    ]);

    // Initialize Adversarial Orchestrator
    this.adversarialOrchestrator = new AdversarialOrchestrator(
      config,
      this.modelExecutor,
      this.validationSystem,
      this.architectureDigest
    );

    // Initialize MonitorAgent (Background Helper) - ENABLED BY DEFAULT
    if (process.env['ENABLE_MONITOR'] !== 'false') {
      this.monitorAgent = new MonitorAgent(config, this.modelExecutor);
      this.setupMonitorListeners();
      this.logger.info('Monitor Agent enabled - continuous TSC watch active');
    }

    this.logger.info({
      sessionId: this.sessionId,
      agentName: config.agentName,
      pogDir: expandTilde(config.pogDir),
      adversarialEnabled: !!this.geminiService
    }, 'Orchestrator initialized with Sovereign Intelligence');
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

  async initialize(): Promise<Result<void>> {
    try {
      await this.setupWebSocket();

      // 1. Initialize Watcher
      const watcherResult = this.watcher.initialize();
      if (!watcherResult.ok) {
        return watcherResult;
      }

      // 1b. Listen for file changes to keep VectorDB fresh (Proactive RAG)
      this.watcher.on('fileChanged', ({ filePath }) => {
        this.logger.debug({ filePath }, 'Proactive indexing triggered');
        void this.indexer.indexFile(filePath);
      });

      const dbResult = await this.vectorDB.initialize();
      if (isErr(dbResult)) return dbResult;

      // 1c. Cold Start Indexing: If DB is empty, perform initial project scan
      const lessonCount = await this.vectorDB.getLessonCount();
      if (lessonCount === 0) {
        this.logger.info('VectorDB is empty. Triggering full project indexing scan...');
        void this.indexer.indexProject();
      }

      this.logger.info({ port: this.config.wsPort }, 'WebSocket server started');
      return { ok: true, value: undefined };
    } catch (error) {
      this.logger.error({ error }, 'Initialization failed');
      return { ok: false, error: error as Error };
    }
  }

  private async setupWebSocket(): Promise<void> {
    const { WebSocketServer } = await import('ws');
    this.wsServer = new WebSocketServer({ port: this.config.wsPort });

    this.wsServer.on('connection', (ws) => {
      this.logger.debug('Client connected');
      ws.send(JSON.stringify({ type: 'state', data: this.getCurrentState() }));

      // Event propagation
      const forwardEvent = (type: string, data: any) => {
        if (ws.readyState === 1) { // OPEN
          ws.send(JSON.stringify({ type, data }));
        }
      };

      this.on('intentExecuted', (data) => forwardEvent('intentExecuted', data));
      this.on('previewStarted', (data) => forwardEvent('previewStarted', data));

      // 1d. Universal Log Streaming (Phase 8)
      this.previewServer.on('log', (log) => forwardEvent('preview_log', log));
      this.previewServer.on('exit', (exit) => forwardEvent('preview_exit', exit));

      // 1e. Human-in-the-Loop Feedback Channel
      ws.on('message', (msg) => {
        try {
          const payload = JSON.parse(msg.toString());
          if (payload.type === 'user_feedback') {
            this.logger.info({ feedback: payload.data }, 'Human-in-the-Loop feedback received');
            this.emit('userFeedback', payload.data);
          }
        } catch (e) {
          this.logger.error({ error: e }, 'Failed to parse WebSocket message');
        }
      });
    });

    this.wsServer.on('error', (error) => this.logger.error({ error }, 'WebSocket error'));
  }

  private setupMonitorListeners(): void {
    if (!this.monitorAgent) return;

    this.monitorAgent.on('issueDetected', (report) => {
      this.logger.warn({
        severity: report.severity,
        category: report.category,
        affectedFiles: report.affectedFiles
      }, 'Monitor Agent detected issue - triggering auto-healing');

      // Auto-heal critical and high-severity TSC errors
      if (report.category === 'tsc' && (report.severity === 'critical' || report.severity === 'high')) {
        void this.handleAutoHeal(report);
      }
    });

    this.monitorAgent.on('healthCheckPassed', () => {
      this.logger.debug('Monitor health check passed - no issues');
    });
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

    // Execute the fix using the top-tier model (Gemini 3 Pro Preview or qwen2.5:14b)
    const result = await this.executeIntent(healPrompt);

    if (result.ok) {
      this.logger.info('Auto-heal workflow completed successfully');
    } else {
      this.logger.error({ error: result.error }, 'Auto-heal workflow failed');
    }
  }

  /**
   * Execute user intent with "Research -> Plan -> Execute -> Review" loop
   */
  /**
   * Execute user intent with Advanced Agent Loop (Google Gemini CLI Pattern)
   * Implements "Research -> Plan -> Execute -> Review" with State Machine and Resilience
   */
  async executeIntent(prompt: string, filePath?: string): Promise<Result<string>> {
    const context: ExecutionContext = {
      prompt,
      ...(filePath ? { filePath } : {}),
      sessionId: this.sessionId,
      startTime: Date.now()
    };

    // Inject Immutable System Prompt
    const fullPrompt = constructInitialPrompt(prompt);

    // Phase 17: Reset context tracking for new high-level intent
    this.lastSentFileHashes.clear();
    this.forceFullContext = true;

    this.logger.info({ prompt: prompt.substring(0, 100) }, 'Executing intent (Advanced Loop)');


    // 0. Check Neural Limbs (Specialized Agents)
    if (await this.webAppForgeLimb.canHandle({ prompt: fullPrompt })) {
      const result = await this.webAppForgeLimb.execute({ prompt: fullPrompt });
      if (result.ok) {
        this.recordSuccessMetadata('webapp_forge', prompt, Date.now() - context.startTime, filePath);

        // Emit preview event if available
        if (result.value.data?.previewUrl) {
          const previewMetadata = (await this.previewServer.getActivePreviews()).find(p => p.url === result.value.data.previewUrl);
          if (previewMetadata) {
            this.emit('previewStarted', previewMetadata);
          }
        }

        return { ok: true, value: result.value.output };
      }
      return { ok: false, error: result.error };
    }

    if (await this.aiLimb.canHandle({ prompt: fullPrompt })) {
      const result = await this.aiLimb.execute({ prompt: fullPrompt });
      if (result.ok) {
        this.recordSuccessMetadata('ai_limb', prompt, Date.now() - context.startTime, filePath);
        return { ok: true, value: result.value.output };
      }
      return { ok: false, error: result.error };
    }

    // Phase 19: Check Esoteric Limbs (Media & Bio)
    if (await this.mediaForgeLimb.canHandle({ prompt: fullPrompt })) {
      const result = await this.mediaForgeLimb.execute({ prompt: fullPrompt });
      if (result.ok) {
        this.recordSuccessMetadata('media_forge', prompt, Date.now() - context.startTime, filePath);
        return { ok: true, value: result.value.output };
      }
      return { ok: false, error: result.error };
    }

    if (await this.bioIntelligenceLimb.canHandle({ prompt: fullPrompt })) {
      const result = await this.bioIntelligenceLimb.execute({ prompt: fullPrompt });
      if (result.ok) {
        this.recordSuccessMetadata('bio_intelligence', prompt, Date.now() - context.startTime, filePath);
        return { ok: true, value: result.value.output };
      }
      return { ok: false, error: result.error };
    }

    // Phase 20: Check Knowledge Limbs (Gutenberg)
    if (await this.gutenbergLimb.canHandle({ prompt: fullPrompt })) {
      const result = await this.gutenbergLimb.execute({ prompt: fullPrompt });
      if (result.ok) {
        this.recordSuccessMetadata('gutenberg_knowledge', prompt, Date.now() - context.startTime, filePath);
        return { ok: true, value: result.value.output };
      }
      return { ok: false, error: result.error };
    }

    let turnCounter = 0;

    // 1. Planning turn (Supervisor Decomposition with Gemini Thinking)
    this.logger.info('Supervisor thinking initiated (Gemini 2.0 Thinking)...');

    const controlTools = this.getControlPlaneTools();
    const projectMap = this.contextBuilder.getProjectMap();
    const hexagramContext = await this.hexagramManager.formatForPrompt();

    const planningTurnPrompt = this.architectureDigest.inject(`${PLANNING_PROMPT}\n\n${hexagramContext}\n\n${projectMap}\n\nUser Task: ${fullPrompt}`);

    const planResult = await this.callModel(
      'gemini:gemini-2.0-flash', // Updated to stable flash for high-speed planning
      planningTurnPrompt,
      controlTools
    );

    let executionPlan: ExecutionPlan = {
      goal: prompt,
      steps: [{ id: 1, description: 'Direct implementation', action: 'MODIFY' }]
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
          }
        } catch (e) {
          this.logger.warn('Failed to parse execution plan, falling back to direct mode');
        }
      }
    }

    let totalResponse = '';
    let lastModel = 'unknown';

    for (const step of executionPlan.steps) {
      turnCounter++;
      context.currentStepId = step.id;
      this.logger.info({ stepId: step.id, action: step.action }, `Executing step: ${step.description}`);

      const hexagramContext = await this.hexagramManager.formatForPrompt();
      const stepPrompt = `OVERALL GOAL: ${executionPlan.goal}
CURRENT STEP (${step.id}/${executionPlan.steps.length}): ${step.description}
ACTION TYPE: ${step.action}
HISTORY: ${totalResponse.substring(0, 500)}...

${hexagramContext}

Perform the current step and output results. If verifying, ensure you run the necessary tools.`;

      const executionTools = this.getAllAvailableTools();
      const turnResult = await this.executeTurn(stepPrompt, context, turnCounter, executionTools, step.action);

      if (turnResult.status === 'continue') {
        // Step requires more work or review
        totalResponse += `\nStep ${step.id} Result: ${turnResult.nextMessage}\n`;
      } else if (turnResult.status === 'stop') {
        if (turnResult.terminateReason === AgentTerminateMode.GOAL) {
          totalResponse += `\nStep ${step.id} Complete: ${turnResult.finalResult ?? ''}\n`;
        } else {
          this.logger.error({ stepId: step.id, reason: turnResult.terminateReason }, 'Step execution failed');
          return { ok: false, error: new Error(`Step ${step.id} failed: ${turnResult.terminateReason}`) };
        }
      }

      if (turnResult.model) lastModel = turnResult.model;
    }

    this.recordSuccessMetadata(lastModel, prompt, Date.now() - context.startTime, filePath);
    this.recordIntent(context, lastModel, true, Date.now() - context.startTime);
    return { ok: true, value: totalResponse };
  }

  private async executeTurn(
    currentMessage: string,
    context: ExecutionContext,
    turnCounter: number,
    tools?: Tool[],
    action?: string
  ): Promise<AgentTurnResult> {
    if (turnCounter > 1) {
      this.emit('reviewStarted', { iteration: turnCounter });
    }

    // 1. Route to best model
    const routeResult = this.router.route(currentMessage, context.filePath);
    if (!routeResult.ok) {
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.ERROR,
        finalResult: null,
        model: 'unknown'
      };
    }

    const selectedModel = routeResult.value;

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
    } else {
      // Standard Research/Verify: Direct Executor call
      callResult = await this.modelExecutor.callModel(selectedModel, augmentedPrompt, tools);
    }

    if (!callResult.ok) {
      this.router.recordFailure(selectedModel);
      this.recordFailureMetadata(selectedModel, augmentedPrompt, callResult.error.message, context.filePath);
      this.emit('executionError', { error: callResult.error, context });
      return {
        status: 'stop',
        terminateReason: AgentTerminateMode.ERROR,
        finalResult: null,
        model: selectedModel
      };
    }

    this.router.recordSuccess(selectedModel);

    // 3. Process Logic (Handle Formal Function Calls and Sandbox Commands)
    const processResult = await this.processFunctionCalls(callResult.value);
    return { ...processResult, model: selectedModel };
  }

  /**
   * Maps text-based command extraction to formal Function Calls
   * Wraps Sandbox.execute logic
   */
  private async processFunctionCalls(modelResponse: ModelResponse): Promise<AgentTurnResult> {
    const { response, functionCalls } = modelResponse;
    const commands = this.sandbox.extractCommands(response);

    let executionResults = '';

    // Handle Task Completion (Signal from model)
    if (response.includes('TASK_COMPLETE')) {
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
        let result: Result<any>;
        if (call.name.includes('hexagram')) {
          result = await this.hexagramLimb.handleToolCall(call.name, call.args);
        } else {
          result = { ok: false, error: new Error(`No handler for tool: ${call.name}`) };
        }

        executionResults += `\nTool: ${call.name}\nResult: ${result.ok ? JSON.stringify(result.value) : result.error.message}\n`;
      }
    }

    // Priority 2: Handle Legacy Sandbox Commands (Extract from text)
    if (commands.length > 0) {
      this.logger.info({ count: commands.length }, 'Tool Calls (Sandbox) Detected');
      for (const cmd of commands) {
        const execResult = await this.sandbox.execute(cmd);

        if (!execResult.ok) {
          this.logger.error({ cmd, error: execResult.error }, 'Tool Execution Failed');
          executionResults += `\nCommand: ${cmd}\nError: ${execResult.error.message}\n`;
          break; // Stop on first error
        }

        const resultValue = execResult.value;
        const success = resultValue.exitCode === 0;
        const output = success ? resultValue.stdout : resultValue.stderr;

        executionResults += `\nCommand: ${cmd}\nExit Code: ${resultValue.exitCode}\nOutput: ${output}\n`;
        this.emit('commandExecuted', { command: cmd, success, output });

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
    const taskType = this.classifyTaskType(prompt);
    const performance: ModelPerformance = {
      model,
      taskType,
      extension: filePath?.split('.').pop() ?? '',
      latency,
      success: true,
      timestamp: Date.now(),
      isFree: true
    };
    this.router.recordPerformance(performance);

    // Learn from success (VectorDB)
    void (async () => {
      let embedding = new Float32Array(this.config.embeddingDimensions).fill(0.1); // Fallback

      if (this.geminiService) {
        const embedResult = await this.geminiService.embed(prompt);
        if (embedResult.ok) {
          // Re-instantiate to match local Float32Array<ArrayBuffer> definition
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
    const taskType = this.classifyTaskType(prompt);

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

  private classifyTaskType(prompt: string): TaskType {
    const patterns = {
      [TaskType.APIOrchestration]: /\b(wrangler|gcloud|gemini|github|api|deploy|cloud|cli)\b/i,
      [TaskType.Architecture]: /\b(design|architect|system)\b/i,
      [TaskType.Syntax]: /\b(fix|syntax|error)\b/i,
      [TaskType.Refactor]: /\b(refactor|optimize)\b/i,
      [TaskType.Debug]: /\b(debug|bug)\b/i,
      [TaskType.Generate]: /\b(create|generate)\b/i,
      [TaskType.Test]: /\b(test|spec)\b/i,
      [TaskType.Docs]: /\b(document|comment|explain)\b/i,
      [TaskType.Diagnostic]: /\b(diagnostic|critic|error-track|path-correction|analyze-error)\b/i
    };
    for (const [type, regex] of Object.entries(patterns)) {
      if (regex.test(prompt)) return type as TaskType;
    }
    return TaskType.Generate;
  }

  private recordIntent(context: ExecutionContext, model: string, success: boolean, time: number): void {
    const intent: IntentHistory = {
      sessionId: context.sessionId,
      query: context.prompt,
      selectedModel: model,
      success,
      timestamp: context.startTime,
      executionTime: time
    };
    this.intentHistory.push(intent);
    this.emit('intentExecuted', intent);
    if (this.intentHistory.length > 1000) this.intentHistory.shift();
  }

  getCurrentState(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      intentCount: this.intentHistory.length,
      recentIntents: this.intentHistory.slice(-10)
    };
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
        const content = readFileSync(absPath, 'utf8');
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

    return this.hexagramLimb.getTools();
  }

  private getControlPlaneTools(): Tool[] {
    const baseTools = this.getAllAvailableTools();
    const planningTools: Tool[] = [
      ...baseTools,
      {
        functionDeclarations: [
          {
            name: 'plan_tool_execution',
            description: 'Decomposes a task into a sequence of actionable steps with tool mappings.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                goal: { type: Type.STRING, description: 'The final objective.' },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.NUMBER },
                      description: { type: Type.STRING },
                      action: { type: Type.STRING, enum: ['RESEARCH', 'MODIFY', 'VERIFY'] }
                    },
                    required: ['id', 'description', 'action']
                  }
                }
              },
              required: ['goal', 'steps']
            }
          },
          {
            name: 'manage_durable_memory',
            description: 'Manages persistent state and assets (Vector snapshots, artifacts) on GCS.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                intent: {
                  type: Type.STRING,
                  enum: ['store_vector_snapshot', 'fetch_execution_artifact', 'commit_model_output', 'archival_cleanup']
                },
                payload_uri: { type: Type.STRING },
                metadata: { type: Type.OBJECT }
              },
              required: ['intent', 'payload_uri']
            }
          },
          {
            name: 'cloud_shell_cognitive_assist',
            description: 'Leverages Gemini in Cloud Shell for terminal-aware code generation or debugging.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                intent: {
                  type: Type.STRING,
                  enum: ['explain_terminal_error', 'generate_infra_script', 'debug_context']
                },
                terminal_context: { type: Type.STRING },
                proposed_action: { type: Type.STRING }
              },
              required: ['intent', 'terminal_context']
            }
          }
        ]
      }
    ];
    return planningTools;
  }

  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up orchestrator');
    await this.previewServer.stopAll();
    if (this.wsServer) this.wsServer.close();
    this.removeAllListeners();
  }
}