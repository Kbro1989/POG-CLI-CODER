/**
 * POG-CODER-VIBE CLI - Terminal-first AI coding interface
 * 
 * Features:
 * - Ternary binary routing (3x faster)
 * - Type-safe error handling
 * - Structured logging
 * - Session management
 * - Real-time VS Code integration
 */

import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { pino } from 'pino';
import * as fs from 'fs';
import { Writable } from 'stream';
import * as net from 'net';

// Default: hide JSON logs, press Ctrl+F12 to reveal
// showLogs is now controlled via showDetailedReports and vibeCLIInstance.bufferReport

const logToggleStream = new Writable({
  write(chunk, encoding, callback) {
    if (showDetailedReports) {
      process.stderr.write(chunk, encoding, callback);
    } else {
      // Buffer logs for F12 view
      const content = chunk.toString();
      try {
        const parsed = JSON.parse(content);
        (vibeCLIInstance as any)?.bufferReport(parsed.level >= 50 ? 'error' : 'info', parsed.msg || content);
      } catch {
        (vibeCLIInstance as any)?.bufferReport('info', content);
      }
      callback();
    }
  }
});

// For singleton access in log stream
let vibeCLIInstance: VibeCLI | null = null;
let showDetailedReports = false;
const reportBuffer: { type: string, content: string }[] = [];

// Resolve project root strictly for .env discovery
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load environment from the project substrate root
dotenv.config({ path: join(projectRoot, '.env') });
import { ConfigManager } from '../src/utils/config.js';
import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';
import { select, drawBox, drawMessage, drawSovereignFooter, drawDetailedReports } from '../src/utils/terminal.js';
import { ServiceDiscovery } from '../src/core/ServiceDiscovery.js';
import { MonitorAgent } from '../src/monitor/MonitorAgent.js';
import { InteractiveMenu } from './InteractiveMenu.js';
import { ModelInventory } from '../src/core/ModelInventory.js';
import { ModelType } from '../src/core/models.js';
import { ShellSpine } from '../src/spines/cli/ShellSpine.js';
import chalk from 'chalk';

const logger = pino({
  name: 'CLI',
  level: process.env['VIBE_LOG_LEVEL'] || 'info',
  base: { hostname: 'POG-VIBE' }
}, logToggleStream);

interface CommandHandler {
  readonly pattern: RegExp;
  readonly description: string;
  readonly handler: (args: string[]) => Promise<void> | void;
}

class VibeCLI {
  private readonly rl: readline.Interface;
  private readonly orchestrator: FreeOrchestrator;
  private readonly configManager: ConfigManager;
  private readonly discovery: ServiceDiscovery;
  private readonly monitor: MonitorAgent;
  private running = true;
  private shutdownResolve?: (value: void | PromiseLike<void>) => void;
  private errorCount = 0;

  constructor(projectRoot: string) {
    vibeCLIInstance = this;
    // Initialize configuration
    this.configManager = new ConfigManager(projectRoot);
    const config = this.configManager.getConfig();

    // Initialize sub-modules
    const watcher = new ASTWatcher(config);
    const vectorDB = new VectorDB(config);
    const sandbox = new Sandbox(config);

    // Initialize orchestrator
    this.orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);
    this.discovery = new ServiceDiscovery(config);
    this.monitor = new MonitorAgent(config, this.orchestrator.getModelExecutor(), this.orchestrator.getHexagramManager());

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎯 vibe> ',
      terminal: true
    });

    // Setup event listeners
    this.setupEventListeners();
    this.setupGlobalHotkeys();

    // Note: Logs are hidden by default. Use 'debug' command or Ctrl+F12 to toggle visibility.

    logger.info({
      projectRoot,
      sessionId: this.orchestrator.getSessionId(),
      wsPort: config.wsPort
    }, 'CLI initialized');
  }

  public bufferReport(type: string, content: string): void {
    if (type === 'error') this.errorCount++;
    reportBuffer.push({ type, content });
    if (reportBuffer.length > 50) reportBuffer.shift();
  }

  private setupGlobalHotkeys(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      readline.emitKeypressEvents(process.stdin);
      process.stdin.on('keypress', (_str, key) => {
        // Ctrl+F12 (matches most terminals for F12 or custom sequence)
        // Note: Many terminals send ESC [ 24 ; 5 ~ for Ctrl+F12
        if (key.name === 'f12' || (key.ctrl && key.name === 'f12')) {
          showDetailedReports = !showDetailedReports;
          this.refreshUI();
        }

        // Allow Ctrl+C to still work despite raw mode
        if (key.ctrl && key.name === 'c') {
          // Sovereign Lock: Ignore standard termination
          process.stdout.write(chalk.yellow('\n\n🛡️  Sovereign Organism Persisting.\n   Use "exit" command to negotiate termination.\n\n🎯 vibe> '));
          return;
        }
      });
    }
  }

  private refreshUI(): void {
    console.clear();
    this.displayBanner();
    if (showDetailedReports) {
      drawDetailedReports(reportBuffer);
    }
    this.renderFooter();
    this.rl.prompt(true);
  }

  private renderFooter(): void {
    const config = this.configManager.getConfig();
    drawSovereignFooter({
      substrate: config.sovereignRoot ? `ACTIVE [${config.sovereignRoot}]` : 'INACTIVE',
      identity: config.identity?.name || 'GHOST',
      extension: this.orchestrator.getEndpointStatus('extension'),
      edge: this.orchestrator.getEndpointStatus('worker'),
      session: this.orchestrator.getSessionId(),
      errors: this.errorCount
    });
  }

  private setupEventListeners(): void {
    // Orchestrator events
    this.orchestrator.on('intentExecuted', (data) => {
      logger.debug({
        model: data.selectedModel,
        success: data.success,
        executionTime: data.executionTime
      }, 'Intent executed');
      this.refreshUI();
    });

    this.orchestrator.on('modelCalled', (data) => {
      this.bufferReport('info', `Using model: ${data.model}`);
      if (showDetailedReports) this.refreshUI();
    });

    this.orchestrator.on('executionError', (data) => {
      this.errorCount++;
      this.bufferReport('error', data.error.message);
      logger.error({
        error: data.error,
        prompt: data.context.prompt.substring(0, 100)
      }, 'Execution error');
      this.refreshUI();
    });

    this.orchestrator.on('awaitingFeedback', (data: { message: string }) => {
      // Display the Thinking Admin's synthesis
      process.stdout.write('\n');
      drawMessage('THOUGHT', data.message);
      process.stdout.write('\n');

      // If voice is enabled, peak the summary
      const config = this.configManager.getConfig();
      if (config.enabledServices?.includes('voice_limb')) {
        // Speak only the summary part (after the title)
        const lines = data.message.split('\n');
        const summary = lines.slice(1).join(' ').replace(/---/g, '').trim();
        if (summary) {
          void this.orchestrator.executeIntent({ prompt: `speak_text text="${summary.substring(0, 150)}"`, force: true });
        }
      }
    });

    // Readline events
    this.rl.on('line', (line: string): void => {
      void (async (): Promise<void> => {
        const rawInput = line.trim();

        // ---------------------------------------------------------
        // PHASE 21: INTERACTIVE MENU TRIGGER
        // ---------------------------------------------------------
        if (rawInput === '/') {
          this.rl.pause();

          const menuItems = this.commands.map(cmd => ({
            label: cmd.pattern.toString().replace(/^\/\^|\$\/i$/g, '').replace(/\\|\|/g, ''),
            value: cmd.pattern.toString(), // Store pattern as ID
            description: cmd.description.split('-')[1]?.trim() || cmd.description
          }));

          // Add dynamic shortcuts
          menuItems.unshift({ label: 'interactive', value: 'interactive', description: 'Interactive AI Session' });

          const menu = new InteractiveMenu(menuItems, this.rl);
          const selection = await menu.show();

          // Resume standard readline
          // Note: menu.show() cleans up raw mode

          if (selection) {
            if (selection === 'interactive') {
              // No-op, just re-prompt
            } else {
              const cmd = this.commands.find(c => c.pattern.toString() === selection);
              if (cmd) {
                await cmd.handler([]);
              }
            }
          }

          if (this.running) {
            this.rl.prompt();
          }
          return;
        }

        await this.handleInput(rawInput);
        if (this.running) {
          this.rl.prompt();
        }
      })();
    });

    this.rl.on('close', (): void => {
      // Prevent accidental closure (e.g. Ctrl+D) if running
      if (this.running) {
        process.stdout.write(chalk.yellow('\n🛡️  Sovereign Persistence Active. Use "exit" to close.\n'));
        this.rl.prompt();
      } else {
        void this.shutdown('readline-close');
      }
    });

    process.on('SIGINT', (): void => {
      // Sovereign Lock: Ignore SIGINT
      process.stdout.write(chalk.yellow('\n\n🛡️  Hive Mind: Termination Signal Rejected.\n   Use "exit" command.\n\n🎯 vibe> '));
    });

    // Optional: Trap SIGTERM as well for stronger persistence
    process.on('SIGTERM', (): void => {
      process.stdout.write(chalk.red('\n\n🛡️  Hive Mind: System termination attempted. Resistance active.\n'));
    });
  }

  async start(): Promise<void> {
    // Initialize orchestrator
    const initResult = await this.orchestrator.initialize();
    if (!initResult.ok) {
      logger.fatal({ error: initResult.error }, 'Failed to initialize orchestrator');
      process.exit(1);
    }

    // Initialize endpoints
    await this.runStartupSequence();

    // Display welcome banner
    this.displayBanner();

    // Generate AI Greeting
    await this.generateGreeting();

    // Start REPL
    this.rl.prompt();

    // Create a promise that resolves when the CLI is shutdown
    return new Promise((resolve) => {
      this.shutdownResolve = resolve;
    });
  }

  private async initialAudit(): Promise<void> {
    const results = await this.discovery.auditAll();
    const extension = results.find(r => r.id === 'extension');
    const worker = results.find(r => r.id === 'worker');

    const mapStatus = (s: string): 'ACTIVE' | 'INACTIVE' | 'PARTIAL' => {
      if (s === 'ACTIVE') return 'ACTIVE';
      if (s === 'PARTIAL') return 'PARTIAL'; // Discovery might return partial later
      return 'INACTIVE'; // Map ERROR, UNKNOWN, INACTIVE to INACTIVE
    };

    if (extension) {
      this.orchestrator.updateEndpointStatus('extension', mapStatus(extension.status));
    }
    if (worker) {
      this.orchestrator.updateEndpointStatus('worker', mapStatus(worker.status));
    }
  }

  private async runStartupSequence(): Promise<void> {
    logger.info('Starting Autonomous Startup Sequence...');

    // 1. Initial Health Audit
    await this.initialAudit();

    // 2. Metabolic Boot (TSC, Tests, Healing)
    const bootResult = await this.monitor.runMetabolicBoot();
    if (!bootResult.ok) {
      logger.error({ message: bootResult.message }, 'Metabolic Boot FAILED. Triggering Emergency Healing Flow...');
      // In a real scenario, we'd trigger the self-healing engine here.
      // For now, we report it to the user.
      drawMessage('SYSTEM', `⚠️ Metabolic Boot Failure: ${bootResult.message}`);
    } else {
      drawMessage('SYSTEM', '✅ Metabolic Boot: ALL SYSTEMS GREEN. Substrate Healthy.');

      // 3. Sovereign Wrangler Fleet Build
      logger.info('Triggering Sovereign Wrangler Fleet Build...');
      try {
        const shell = new ShellSpine(this.configManager.getConfig());
        const result = await shell.getTools().find(t => t.name === 'sh_exec')!.handler({
          command: 'npm run fleet:build'
        });

        if (result.ok && (result.value as any).exitCode === 0) {
          logger.info('Sovereign Fleet Build Completed.');
          this.bufferReport('info', 'Fleet Build SUCCESS');

          // Background dev server
          void shell.getTools().find(t => t.name === 'sh_exec')!.handler({
            command: 'npm run fleet:html-dev'
          });
        } else {
          const err = result.ok ? (result.value as any).stderr : (result as any).error?.message;
          logger.error({ err }, 'Sovereign Fleet Build Failed');
          this.bufferReport('error', `Fleet Build FAILED: ${err}`);
        }
      } catch (err) {
        logger.error({ err }, 'Failed to orchestrate fleet build');
      }
    }

    // 4. Dashboard Synchronization
    const config = this.configManager.getConfig();
    const port = config.wsPort || 8765;

    const isPortOpen = await new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(500);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
      socket.on('error', () => { socket.destroy(); resolve(false); });
      socket.connect(port, '127.0.0.1');
    });

    if (isPortOpen) {
      logger.info({ port }, 'Dashboard already open. Synchronizing session...');
    } else {
      logger.info({ port }, 'Launching new dashboard substrate...');
      const url = `http://localhost:${port}/dashboard`;
      logger.info({ url }, 'Dashboard launching logic standby.');
    }
  }

  private displayBanner(): void {
    const config = this.configManager.getConfig();
    const extensionStatus = this.orchestrator.getEndpointStatus('extension');
    const workerStatus = this.orchestrator.getEndpointStatus('worker');

    const extLine = extensionStatus === 'ACTIVE' ? chalk.green('IS') : extensionStatus === 'PARTIAL' ? chalk.yellow('PARTIALLY') : chalk.red('IS NOT');
    const workerLine = workerStatus === 'ACTIVE' ? chalk.green('IS') : workerStatus === 'PARTIAL' ? chalk.yellow('PARTIALLY') : chalk.red('IS NOT');
    const sovereignLine = config.sovereignRoot ? chalk.green(`ACTIVE [${config.sovereignRoot}]`) : chalk.gray('NOT DETECTED');

    console.clear();
    drawBox('🚀 POG-CODER-VIBE: NEUROLOGICAL SOVEREIGNTY', [
      `📁 Root:       ${config.projectRoot} `,
      `🧠 CNS Class:  ${config.projectId} `,
      `🆔 Identity:   ${config.identity?.email || 'UNRESOLVED'} [${config.identity?.source?.toUpperCase() || 'SEARCHING'}]`,
      `🔬 Medical:    READY [diag_env.ts]`,
      `👻 Ghost:      FAILBACK [Cloud DC]`,
      `🏰 Substrate:  ${sovereignLine} `,
      `🔌 Extension:  ${extLine} `,
      `🌩️ Edge:       ${workerLine} `,
      `🌌 Constellation: ONLINE [Gemini 2.0 Flash]`,
      '',
      chalk.cyan('Ready to take on the world. Neurological Sovereignty active.'),
      chalk.gray('• Code Pro • App Forge • Book Reader • Creative Friend • RSC Archaeology'),
      '',
      'Type your intent to begin, or use "help" for a list of commands.'
    ]);
  }

  private async generateGreeting(): Promise<void> {
    const greetingIntent = "Greet the user in your new 'Ready to Take on the World' persona. Briefly mention your versatility (code, books, creative partner, complex apps) and invite them to start something amazing. Stay brilliant and straight up.";
    try {
      logger.info('Generating initial AI greeting...');
      const result = await this.orchestrator.executeIntent(greetingIntent);
      if (result.ok) {
        drawMessage('POG', result.value.output);
      } else {
        this.bufferReport('warn', `Greeting failed: ${result.error.message}`);
        logger.warn({ error: result.error }, 'Initial greeting failed (continuing normally)');
      }
    } catch (error) {
      // Silently fail if greeting fails, don't block startup
      this.bufferReport('warn', `Greeting interface error: ${(error as Error).message}`);
      logger.debug({ error }, 'Failed to generate initial greeting');
    }
  }

  private async performAudit(): Promise<void> {
    process.stdout.write(chalk.gray('\n🔍 Auditing Sovereign Intelligence Substrate...\n'));
    const auditResults = await this.discovery.auditAll();

    const lines = auditResults.map(res => {
      const isActive = res.status === 'ACTIVE';
      const isHealthy = res.health;

      const icon = isActive ? chalk.green('✔') : res.status === 'ERROR' ? chalk.red('✘') : chalk.gray('○');
      let statusText = isActive ? chalk.green(res.status) : res.status === 'ERROR' ? chalk.red(res.status) : chalk.gray(res.status);

      // If service is healthy but not active, show as "Authorized" in yellow to indicate potential issue or pending setup
      if (!isActive && isHealthy) {
        statusText = chalk.yellow('AUTHORIZED');
      }

      return `${icon} ${res.name.padEnd(20)} [${statusText}] ${res.details ? chalk.gray('(' + res.details + ')') : ''} `;
    });

    drawBox('⚙️  SERVICE DISCOVERY & MCP STATUS', lines, 80);
    process.stdout.write('\n');
  }

  private readonly commands: ReadonlyArray<CommandHandler> = [
    {
      pattern: /^exit$/i,
      description: 'exit             - Quit (saves session)',
      handler: (args: string[]): void => {
        void args;
        this.running = false;
        this.rl.close();
      }
    },
    {
      pattern: /^help$/i,
      description: 'help             - Show this help & live substrate status',
      handler: async (args: string[]): Promise<void> => {
        void args;
        const audit = await this.discovery.auditAll();
        const diagnosis = await this.monitor.diagnoseState();
        const activeServices = audit.filter(s => s.status === 'ACTIVE').length;
        const config = this.configManager.getConfig();

        // eslint-disable-next-line no-console
        console.log(chalk.bold('\n📚 Sovereign Library of Commands:\n'));
        for (const cmd of this.commands) {
          // eslint-disable-next-line no-console
          console.log(`  ${cmd.description} `);
        }

        console.log('\n💬 Conversational Intelligence:');
        console.log('  Any input that doesn\'t match a command is treated as an AI intent.');
        console.log('  You can chat, ask for code, or explore literary styles naturally.');

        if (config.activeStyle) {
          console.log('\n🎭 Active Persona Style:');
          console.log(`  Author:    ${chalk.yellow(config.activeStyle.author)}`);
          console.log(`  Tone:      ${chalk.cyan(config.activeStyle.tone)}`);
          console.log(`  Source:    "${config.activeStyle.title}"`);
        } else {
          console.log('\n🎭 Active Persona Style:');
          console.log(`  Status:    ${chalk.gray('Standard POG-VIBE')}`);
          console.log('  Tip:       Use "Master style of book <id>" to learn from Gutenberg.');
        }

        console.log('\n📡 Substrate Status:');
        console.log(`  CNS Health:    ${activeServices}/${audit.length} Organs Active`);
        console.log(`  Metabolism:    ${diagnosis.decision === 'Yang' ? chalk.green('Optimal') : chalk.red('Degraded')}`);
        console.log(`  Vigilance:     ${chalk.cyan(diagnosis.reasoning)}`);

        console.log('\n💡 Tips:');
        console.log('  - Operations are verified against the localized D:\\ [Somatic Memory]');
        console.log('  - Medical Class (scripts) monitors for real-time state regression');
        console.log('  - "voice" triggers microphone and ambient status reporting');
        console.log('  - "Escalate" to Cloud models automatically when local context is exceeded');
        console.log('  - "history" view tracks recent neural paths');
        console.log('');
      }
    },
    {
      pattern: /^(health|audit)$/i,
      description: 'health           - Run substrate health audit',
      handler: async (args: string[]): Promise<void> => {
        void args;
        await this.performAudit();
      }
    },
    {
      pattern: /^drive$/i,
      description: 'drive            - Audit Sovereign Root (D: Drive) health',
      handler: async (args: string[]): Promise<void> => {
        void args;
        const config = this.configManager.getConfig();
        const root = config.sovereignRoot || 'Not Found';
        const hasD = fs.existsSync('D:\\');

        import('../src/utils/terminal.js').then(term => {
          term.drawSovereignReport('Drive Audit', {
            'Sovereign Root': root,
            'Physical D: Drive': hasD ? 'Present' : 'Missing',
            'Learning DB': fs.existsSync(join(root, 'vibe-learning.db')) ? 'Mounted' : 'Local Only',
            'Gutenberg Cache': fs.existsSync(join(root, 'gutenberg-cache')) ? 'External' : 'Internal',
            'Dashboard States': fs.existsSync(join(root, 'session_dashboards')) ? 'Persistent' : 'Ephemeral'
          });
        });
      }
    },
    {
      pattern: /^debug$/i,
      description: 'debug            - Show current detailed report buffer',
      handler: (args: string[]): void => {
        void args;
        showDetailedReports = !showDetailedReports;
        this.refreshUI();
      }
    },
    {
      pattern: /^history$/i,
      description: 'history          - View intent history',
      handler: (args: string[]): void => {
        void args;
        const history = this.orchestrator.getIntentHistory();
        if (history.length === 0) {
          // eslint-disable-next-line no-console
          console.log('No intents executed yet.\n');
          return;
        }

        // eslint-disable-next-line no-console
        console.log('\n📊 Intent History:\n');
        const recent = history.slice(-10);
        for (const intent of recent) {
          const status = intent.success ? '✅' : '❌';
          const time = new Date(intent.timestamp).toLocaleTimeString();
          // eslint-disable-next-line no-console
          console.log(`${status} [${time}] ${intent.selectedModel} `);
          // eslint-disable-next-line no-console
          console.log(`   "${intent.query.substring(0, 60)}..."`);
          // eslint-disable-next-line no-console
          console.log(`   Execution time: ${intent.executionTime} ms\n`);
        }
      }
    },
    {
      pattern: /^state$/i,
      description: 'state            - Show current state',
      handler: (_args: string[]): void => {
        const state = this.orchestrator.getCurrentState();
        const hex = this.orchestrator.getStrategicPosture();

        console.log('\n🎯 Sovereign System State:\n');
        console.log(chalk.cyan(`  Focus:     ${hex.hexagram} (${hex.binary})`));
        console.log(chalk.cyan(`  Strategy:  ${hex.strategy}`));
        console.log(chalk.cyan(`  Narrative: ${state['narrative'] || 'Observing substrate...'}`));

        if (hex.lines) {
          console.log(chalk.yellow('\n  Yao Pillars (Lines):'));
          hex.lines.forEach(l => {
            console.log(chalk.dim(`    Line ${l.index}: ${l.state.padEnd(20)} | ${l.title}`));
          });
        }

        console.log('');
        console.log(JSON.stringify(state, (key, value) => {
          if (key === 'narrative') return undefined; // Already shown
          return value;
        }, 2));
        console.log('');
      }
    },
    {
      pattern: /^config$/i,
      description: 'config           - Show configuration',
      handler: (args: string[]): void => {
        void args;
        const config = this.configManager.getConfig();
        // eslint-disable-next-line no-console
        console.log('\n⚙️  Configuration:\n');
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(config, null, 2));
        // eslint-disable-next-line no-console
        console.log('');
      }
    },
    {
      pattern: /^projects$/i,
      description: 'projects         - List known workspace projects',
      handler: async (args: string[]): Promise<void> => {
        void args;
        const config = this.configManager.getConfig();
        console.log('\n🌌 Known Workspace Projects:\n');
        const workspaces = config.workspaces || [];
        if (workspaces.length === 0) {
          console.log(chalk.gray('  No explicitly defined workspaces. Global mode active.'));
        } else {
          workspaces.forEach(w => {
            const isCurrent = w.includes(config.projectId) || config.projectRoot.includes(w);
            console.log(`  ${isCurrent ? chalk.green('➔') : ' '} ${w} `);
          });
        }
        console.log('');
      }
    },
    {
      pattern: /^init$/i,
      description: 'init             - Initialize local sovereign environment (.pog)',
      handler: async (args: string[]): Promise<void> => {
        void args;
        const localPog = join(process.cwd(), '.pog');
        if (fs.existsSync(localPog)) {
          // eslint-disable-next-line no-console
          console.log(`\n⚠️  Local environment already exists: ${localPog} \n`);
          return;
        }

        try {
          fs.mkdirSync(localPog);
          fs.writeFileSync(
            join(localPog, 'config.json'),
            JSON.stringify({
              wsPort: 8765,
              circuitBreakerThreshold: 3,
              logLevel: 'info'
            }, null, 2)
          );
          // eslint-disable-next-line no-console
          console.log(`\n✅ Initialized Sovereign POG Environment`);
          // eslint-disable-next-line no-console
          console.log(`   Location: ${localPog} `);
          // eslint-disable-next-line no-console
          console.log(`   Status:   Ready for offline / local work\n`);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`\n❌ Init failed: ${(e as Error).message} \n`);
        }
      }
    },
    {
      pattern: /^models$/i,
      description: 'models           - Manage AI models with dynamic discovery',
      handler: async (args: string[]): Promise<void> => {
        void args;
        const config = this.configManager.getConfig();
        const allModels = ModelInventory.getAvailableModels(config);

        const items = allModels.map(m => {
          let status = chalk.gray('[Offline]');
          const hasGoogle = !!process.env['GOOGLE_API_KEY'];
          const hasCF = !!process.env['CLOUDFLARE_API_TOKEN'];
          const hasHF = !!process.env['HUGGINGFACE_API_KEY'];

          if (m.type === ModelType.Local) {
            status = chalk.green('[Ready]'); // Assume local is ready for selection
          } else if (m.type === ModelType.CloudFree && m.command.includes('google') && hasGoogle) {
            status = chalk.yellow('[Cloud]');
          } else if (m.type === ModelType.Cloudflare && hasCF) {
            status = chalk.blue('[CF]');
          } else if (m.type === ModelType.CloudFree && m.command.includes('huggingface') && hasHF) {
            status = chalk.magenta('[HF]');
          }

          return {
            value: m.name,
            label: `${m.name.padEnd(30)} ${status}`,
            description: `${m.capabilities.join(', ')} (Priority: ${m.priority})`
          };
        });

        console.log(chalk.bold('\n🔍 Sovereign Model Inventory (Ternary Logic)\n'));
        const selected = await select('🔧 Calibrate Neural Path', items);

        if (selected) {
          console.log(`\n✅ Model targeted: ${chalk.cyan(selected)}`);
          console.log(chalk.gray('   This choice will influence the next strategic posture update.\n'));
        }
      }
    },
    {
      pattern: /^voice$/i,
      description: 'voice            - Trigger microphone transcription (Voice Chat)',
      handler: async (args: string[]): Promise<void> => {
        void args;
        // eslint-disable-next-line no-console
        console.log(chalk.cyan('\n🎙️  Listening (5 seconds)... Speak now!\n'));
        try {
          const result = await this.orchestrator.executeIntent('voice transcription');
          if (result.ok) {
            const transcription = typeof (result.value.data as Record<string, unknown>)['transcription'] === 'string'
              ? (result.value.data as Record<string, unknown>)['transcription'] as string
              : '';

            // eslint-disable-next-line no-console
            console.log(chalk.green(`\n🗣️  You said: "${transcription}"\n`));

            // Execute the transcribed text as a new intent
            if (transcription) {
              await this.handleInput(transcription);
            }
          } else {
            // eslint-disable-next-line no-console
            console.error(chalk.red(`\n❌ Voice Error: ${result.error.message} \n`));
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(chalk.red(`\n❌ Voice Interface Error: ${(error as Error).message} \n`));
        }
      }
    },
    {
      pattern: /^create\s+(.+)$/i,
      description: 'create           - Create full-stack app (WebApp Forge)',
      handler: async (args: string[]): Promise<void> => {
        const prompt = args.join(' ');
        // eslint-disable-next-line no-console
        console.log(`\n🔨 WebApp Forge: "${prompt}"\n`);

        try {
          await this.executeIntent(`create ${prompt} `);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Forge Error: ${(error as Error).message} \n`);
        }
      }
    },
    {
      pattern: /^toggle\s+(.+)$/i,
      description: 'toggle <id>      - Enable/Disable service (Budget Control)',
      handler: async (args: string[]): Promise<void> => {
        const serviceId = args[0]?.toLowerCase();
        if (!serviceId) {
          drawMessage('SYSTEM', 'Usage: toggle <serviceId> (e.g., gemini, vision, mcp_gitkraken)');
          return;
        }

        const config = this.configManager.getConfig();
        const enabled = config.enabledServices || [];
        const index = enabled.indexOf(serviceId);

        let newEnabled: string[];
        if (index > -1) {
          newEnabled = enabled.filter(s => s !== serviceId);
          drawMessage('SYSTEM', `🚫 Service[${serviceId}] Shifted to Yin (Dormant)`);
        } else {
          newEnabled = [...enabled, serviceId];
          drawMessage('SYSTEM', `✅ Service[${serviceId}] Shifted to Yang (Active)`);
        }

        this.configManager.updateConfig({ enabledServices: newEnabled });
      }
    },
    {
      pattern: /^manifest\s+(.+)$/i,
      description: 'manifest <path>  - Generate pog.md manifest for a directory',
      handler: async (args: string[]): Promise<void> => {
        const path = args[0] || '.';
        // eslint-disable-next-line no-console
        console.log(`\n📁 Generating Manifest for: "${path}"...\n`);

        try {
          const result = await this.orchestrator.executeIntent({
            prompt: `CLUSTER_INTENT: [SENSE] the files in directory "${path}". [REFLECT] on their purpose based on their names and context. [ACT] Create or update a "pog.md" manifest in that directory.The manifest must have a title "# 📁 Pog Manifest: ${path}", a brief summary, and a "## 📄 File Inventory" table or list with professional descriptions for EVERY file found.Do NOT use absolute paths.`,
            model: 'gemini:gemini-2.0-flash'
          });
          if (result.ok) {
            // eslint-disable-next-line no-console
            console.log(chalk.green(`\n✅ Manifest generated successfully.\n`));
          } else {
            // eslint-disable-next-line no-console
            console.error(chalk.red(`\n❌ Manifest Error: ${result.error.message} \n`));
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(chalk.red(`\n❌ Manifest Interface Error: ${(error as Error).message} \n`));
        }
      }
    },
    {
      pattern: /^play-rsc$/i,
      description: 'play-rsc         - Start autonomous RSC gameplay with AI (Kimi)',
      handler: async (args: string[]): Promise<void> => {
        void args;
        console.log(chalk.cyan('\n🎮 Starting Autonomous RSC Gameplay...\n'));

        try {
          // Import game loop
          const { RSCGameLoop } = await import('../src/limbs/experimental/rsc/RSCGameLoop.js');
          const { RSCLimb } = await import('../src/limbs/experimental/rsc/RSCLimb.js');

          // Initialize RSCLimb
          const config = this.configManager.getConfig();
          const executor = this.orchestrator.getModelExecutor();
          const rscLimb = new RSCLimb(config, executor);

          // Configure game loop
          const gameConfig = {
            username: 'pog ai',
            password: 'pog_ai',
            model: 'qwen2.5-coder:14b',
            maxActions: 20,
            thinkDelay: 2000 // 2 seconds between actions
          };

          console.log(chalk.gray(`Username: ${gameConfig.username}`));
          console.log(chalk.gray(`Model: ${gameConfig.model}`));
          console.log(chalk.gray(`Max Actions: ${gameConfig.maxActions}\n`));

          // Start game loop (no executor needed - uses direct Ollama API)
          const gameLoop = new RSCGameLoop(rscLimb, gameConfig);
          await gameLoop.start();

          console.log(chalk.green('\n✅ Autonomous gameplay session completed!\n'));
        } catch (error) {
          console.error(chalk.red(`\n❌ Gameplay Error: ${(error as Error).message}\n`));
          logger.error({ error }, 'RSC gameplay failed');
        }
      }
    },
    {
      pattern: /^view\s+(.+)$/i,
      description: 'view <target>    - Capture & analyze any visual target with AI (Sovereign Eye + Chromanumber)',
      handler: async (args: string[]): Promise<void> => {
        const target = args.join(' ').trim();
        if (!target) {
          // eslint-disable-next-line no-console
          console.log(chalk.yellow('\nUsage: view <target>'));
          // eslint-disable-next-line no-console
          console.log(chalk.gray('  view http://localhost:3000  — Capture dev server'));
          // eslint-disable-next-line no-console
          console.log(chalk.gray('  view wrangler               — Capture wrangler dev (port 8787)'));
          // eslint-disable-next-line no-console
          console.log(chalk.gray('  view ./index.html            — Capture HTML file'));
          // eslint-disable-next-line no-console
          console.log(chalk.gray('  view rsc                     — View RSC game state'));
          // eslint-disable-next-line no-console
          console.log(chalk.gray('  view window:Notepad          — Capture window by title\n'));
          return;
        }

        // eslint-disable-next-line no-console
        console.log(chalk.cyan(`\n👁️ Sovereign Eye — Capturing: "${target}"...\n`));

        try {
          const { SovereignEye } = await import('../src/core/SovereignEye.js');
          const eye = new SovereignEye(this.configManager.getConfig().projectId);

          // Auto-detect source type from target string
          let sourceType: 'url' | 'html' | 'rsc' | 'window' | 'file' = 'url';
          let resolvedTarget = target;

          if (target.toLowerCase() === 'rsc') {
            sourceType = 'rsc';
            resolvedTarget = 'game_client';
          } else if (target.toLowerCase() === 'wrangler') {
            sourceType = 'url';
            resolvedTarget = 'http://localhost:8787';
          } else if (target.startsWith('window:')) {
            sourceType = 'window';
            resolvedTarget = target.substring(7);
          } else if (target.endsWith('.html') || target.endsWith('.htm')) {
            sourceType = 'html';
          } else if (target.startsWith('http://') || target.startsWith('https://')) {
            sourceType = 'url';
          } else if (target.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
            sourceType = 'file';
          } else {
            // Default: treat as URL
            sourceType = 'url';
            if (!target.includes('://')) {
              resolvedTarget = `http://${target}`;
            }
          }

          // eslint-disable-next-line no-console
          console.log(chalk.gray(`Source type: ${sourceType}`));
          // eslint-disable-next-line no-console
          console.log(chalk.gray(`Target: ${resolvedTarget}\n`));

          const result = await eye.capture(
            { type: sourceType, target: resolvedTarget } as any,
            { width: 1280, height: 720 }
          );

          if (result.ok) {
            const capture = result.value;
            // eslint-disable-next-line no-console
            console.log(chalk.green('✅ Capture complete!'));
            if (capture.imagePath) {
              // eslint-disable-next-line no-console
              console.log(chalk.cyan(`📸 Screenshot: ${capture.imagePath}`));
            }
            if (capture.textContent) {
              // eslint-disable-next-line no-console
              console.log(chalk.gray(`\n--- Text Content (first 500 chars) ---`));
              // eslint-disable-next-line no-console
              console.log(capture.textContent.substring(0, 500));
              // eslint-disable-next-line no-console
              console.log(chalk.gray(`--- End ---\n`));
            }
            // eslint-disable-next-line no-console
            console.log(chalk.gray(`Metadata: ${JSON.stringify(capture.metadata)}\n`));
          } else {
            // eslint-disable-next-line no-console
            console.error(chalk.red(`\n❌ Capture failed: ${result.error.message}\n`));
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(chalk.red(`\n❌ Sovereign Eye Error: ${(error as Error).message}\n`));
          logger.error({ error }, 'Sovereign Eye capture failed');
        }
      }
    }
  ];

  private async handleInput(input: string): Promise<void> {
    if (!input) {
      return;
    }

    // Support slash commands: strip leading '/' if present
    const cleanInput = (input.startsWith('/') && input.length > 1) ? input.substring(1) : input;

    // Check for built-in commands
    for (const cmd of this.commands) {
      if (cmd.pattern.test(cleanInput)) {
        await cmd.handler(cleanInput.split(/\s+/).slice(1));
        return;
      }
    }

    // Treat as AI intent
    await this.executeIntent(cleanInput);
  }

  private async executeIntent(prompt: string): Promise<void> {
    drawMessage('USER', prompt);

    try {
      const result = await this.orchestrator.executeIntent(prompt);
      // const executionTime = Date.now() - startTime;

      if (!result.ok) {
        drawMessage('SYSTEM', `Error: ${result.error.message} `);
        return;
      }

      // Premium POG response
      drawMessage('POG', result.value.output);

      // UI is auto-refreshed via events and refreshUI()
    } catch (error) {
      logger.error({ error }, 'Unexpected error');
      drawMessage('SYSTEM', `Unexpected error: ${(error as Error).message} `);
    }
  }

  private async shutdown(reason = 'user-requested'): Promise<void> {
    logger.info({ reason }, 'Shutting down CLI');
    this.running = false;

    try {
      await Promise.resolve(this.orchestrator.cleanup());
    } catch (err) {
      logger.error({ err }, 'Error during orchestrator cleanup');
    }

    // eslint-disable-next-line no-console
    console.log(`\n💾 Session saved (Reason: ${reason})`);
    // eslint-disable-next-line no-console
    console.log(`📊 Total intents: ${this.orchestrator.getIntentHistory().length} `);
    // eslint-disable-next-line no-console
    console.log('👋 Goodbye!\n');

    if (this.shutdownResolve) {
      this.shutdownResolve();
    }
  }

  async handleDirectCommand(command: string, args: string[]): Promise<void> {
    await this.initialAudit();
    for (const cmd of this.commands) {
      if (cmd.pattern.test(command)) {
        await cmd.handler(args);
        return;
      }
    }

    // Capture the intent and execute it
    const intent = [command, ...args].join(' ');
    await this.handleInput(intent);

    // Shutdown after direct intent execution
    await this.shutdown('direct-command-complete');
  }
}

/**
 * Main command loop and entry point
 */
export async function main(): Promise<void> {
  try {
    const projectRoot = process.cwd();
    const cli = new VibeCLI(projectRoot);

    const args = process.argv.slice(2);
    if (args.length > 0) {
      const command = args[0]!; // Guaranteed by args.length > 0
      const cmdArgs = args.slice(1);
      await cli.handleDirectCommand(command, cmdArgs);
    } else {
      await cli.start();
    }
  } catch (error) {
    logger.fatal({ error }, 'Fatal error');
    // eslint-disable-next-line no-console
    console.error('💥 Fatal error:', (error as Error).message);
    process.exit(1);
  }
}

// Support direct execution
const currentScript = (process.argv[1] || '').replace(/\\/g, '/');
if (currentScript.endsWith('cli/index.ts') || currentScript.endsWith('dist/cli.js') || currentScript.endsWith('dist/cli.cjs') || currentScript.endsWith('cli/index.js')) {
  void main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { VibeCLI };
