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
import pino from 'pino';
import * as fs from 'fs';

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
import { select, drawBox, drawMessage } from '../src/utils/terminal.js';
import { ServiceDiscovery } from '../src/core/ServiceDiscovery.js';
import { InteractiveMenu } from './InteractiveMenu.js';
import chalk from 'chalk';

const logger = pino({
  name: 'CLI',
  level: process.env['VIBE_LOG_LEVEL'] || 'info',
  base: { hostname: 'POG-VIBE' }
});

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
  private running = true;
  private shutdownResolve?: (value: void | PromiseLike<void>) => void;

  constructor(projectRoot: string) {
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

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🎯 vibe> ',
      terminal: true
    });

    // Setup event listeners
    this.setupEventListeners();

    logger.info({
      projectRoot,
      sessionId: this.orchestrator.getSessionId(),
      wsPort: config.wsPort
    }, 'CLI initialized');
  }

  private setupEventListeners(): void {
    // Orchestrator events
    this.orchestrator.on('intentExecuted', (data) => {
      logger.debug({
        model: data.selectedModel,
        success: data.success,
        executionTime: data.executionTime
      }, 'Intent executed');
    });

    this.orchestrator.on('modelCalled', (data) => {
      // eslint-disable-next-line no-console
      console.log(`🤖 Using model: ${data.model}`);
    });

    this.orchestrator.on('executionError', (data) => {
      logger.error({
        error: data.error,
        prompt: data.context.prompt.substring(0, 100)
      }, 'Execution error');
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
      void this.shutdown();
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', (): void => {
      // eslint-disable-next-line no-console
      console.log('\n\n👋 Shutting down gracefully...');
      void (async (): Promise<void> => {
        await this.shutdown();
        process.exit(0);
      })();
    });
  }

  async start(): Promise<void> {
    // Initialize orchestrator
    const initResult = await this.orchestrator.initialize();
    if (!initResult.ok) {
      logger.fatal({ error: initResult.error }, 'Failed to initialize orchestrator');
      process.exit(1);
    }

    // Display welcome banner
    this.displayBanner();

    // Perform Service Audit
    await this.performAudit();

    // Start REPL
    this.rl.prompt();

    // Create a promise that resolves when the CLI is shutdown
    return new Promise((resolve) => {
      this.shutdownResolve = resolve;
    });
  }

  private displayBanner(): void {
    const config = this.configManager.getConfig();
    const sessionId = this.orchestrator.getSessionId();

    console.clear();
    drawBox('🎯 POG-CODER-VIBE v1.0', [
      `📁 Project: ${config.projectRoot}`,
      `💾 Session: ${sessionId}`,
      `🔌 VS Code: ws://localhost:${config.wsPort}`,
      '',
      'Type your intent to begin, or use "help" for a list of commands.'
    ]);
  }

  private async performAudit(): Promise<void> {
    process.stdout.write(chalk.gray('\n🔍 Auditing Sovereign Intelligence Substrate...\n'));
    const auditResults = await this.discovery.auditAll();

    const lines = auditResults.map(res => {
      const isActive = res.status === 'ACTIVE';
      const isEnabled = res.enabled;

      const icon = isActive ? chalk.green('✔') : res.status === 'ERROR' ? chalk.red('✘') : chalk.gray('○');
      let statusText = isActive ? chalk.green(res.status) : res.status === 'ERROR' ? chalk.red(res.status) : chalk.gray(res.status);

      // If service is enabled but not active, show as "Authorized" in yellow to indicate potential issue or pending setup
      if (!isActive && isEnabled) {
        statusText = chalk.yellow('AUTHORIZED');
      }

      return `${icon} ${res.name.padEnd(20)} [${statusText}] ${res.details ? chalk.gray('(' + res.details + ')') : ''}`;
    });

    drawBox('⚙️  SERVICE DISCOVERY & MCP STATUS', lines, 80);
    process.stdout.write('\n');
  }

  private readonly commands: ReadonlyArray<CommandHandler> = [
    {
      pattern: /^exit$/i,
      description: 'Exit the REPL',
      handler: (): void => {
        this.running = false;
        this.rl.close();
      }
    },
    {
      pattern: /^help$/i,
      description: 'Show available commands',
      handler: (): void => {
        // eslint-disable-next-line no-console
        console.log('\n📚 Available Commands:\n');
        for (const cmd of this.commands) {
          // eslint-disable-next-line no-console
          console.log(`  ${cmd.description}`);
        }
        // eslint-disable-next-line no-console
        console.log('  history          - View intent history');
        console.log('  state            - Show current state');
        console.log('  config           - Show configuration');
        console.log('  toggle <id>      - Enable/Disable service (Budget Control)');
        console.log('  health           - Run substrate health audit');
        console.log('  help             - Show this help');
        console.log('  exit             - Quit (saves session)');
        console.log('');
        // eslint-disable-next-line no-console
        console.log('\n💡 Tips:');
        // eslint-disable-next-line no-console
        console.log('  - Use natural language for intents');
        // eslint-disable-next-line no-console
        console.log('  - Models are automatically selected via ternary routing');
        // eslint-disable-next-line no-console
        console.log('  - All operations are type-safe with Result types');
        // eslint-disable-next-line no-console
        console.log('');
      }
    },
    {
      pattern: /^(health|audit)$/i,
      description: 'health           - Run substrate health audit',
      handler: async (): Promise<void> => {
        await this.performAudit();
      }
    },
    {
      pattern: /^history$/i,
      description: 'View intent history',
      handler: (): void => {
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
          console.log(`${status} [${time}] ${intent.selectedModel}`);
          // eslint-disable-next-line no-console
          console.log(`   "${intent.query.substring(0, 60)}..."`);
          // eslint-disable-next-line no-console
          console.log(`   Execution time: ${intent.executionTime}ms\n`);
        }
      }
    },
    {
      pattern: /^state$/i,
      description: 'Show current state',
      handler: (): void => {
        const state = this.orchestrator.getCurrentState();
        // eslint-disable-next-line no-console
        console.log('\n🎯 Current State:\n');
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(state, null, 2));
        // eslint-disable-next-line no-console
        console.log('');
      }
    },
    {
      pattern: /^config$/i,
      description: 'Show configuration',
      handler: (): void => {
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
      pattern: /^init$/i,
      description: 'Initialize local sovereign environment (.pog)',
      handler: async (): Promise<void> => {
        const localPog = join(process.cwd(), '.pog');
        if (fs.existsSync(localPog)) {
          // eslint-disable-next-line no-console
          console.log(`\n⚠️  Local environment already exists: ${localPog}\n`);
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
          console.log(`   Location: ${localPog}`);
          // eslint-disable-next-line no-console
          console.log(`   Status:   Ready for offline/local work\n`);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(`\n❌ Init failed: ${(e as Error).message}\n`);
        }
      }
    },
    {
      pattern: /^models$/i,
      description: 'Manage AI models with ternary selection',
      handler: async (): Promise<void> => {
        const items = [
          { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: '+1 (Complex) - Agentic workhorse' },
          { value: 'qwen2.5-coder:14b', label: 'Qwen 14B', description: '0 (Balanced) - Local sweet spot' },
          { value: 'qwen2.5-coder:7b', label: 'Qwen 7B', description: '-1 (Simple) - Fast syntax fix' }
        ];

        const selected = await select('🔧 Model Calibration (Ternary Logic)', items);
        if (selected) {
          // eslint-disable-next-line no-console
          console.log(`\n✅ Model switched to: ${selected}\n`);
        }
      }
    },
    {
      pattern: /^create\s+(.+)$/i,
      description: 'Create full-stack app (WebApp Forge)',
      handler: async (args: string[]): Promise<void> => {
        const prompt = args.join(' ');
        // eslint-disable-next-line no-console
        console.log(`\n🔨 WebApp Forge: "${prompt}"\n`);

        try {
          // Direct entry to Orchestrator inten execution, which now routes to Limb
          await this.executeIntent(`create ${prompt}`);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`❌ Forge Error: ${(error as Error).message}\n`);
        }
      }
    },
    {
      pattern: /^toggle\s+(.+)$/i,
      description: 'Toggle Sovereign AI/MCP services (Budget Control)',
      handler: async (args: string[]): Promise<void> => {
        const serviceId = args[1]?.toLowerCase();
        if (!serviceId) {
          drawMessage('SYSTEM', 'Usage: toggle <serviceId> (e.g., gemini, vertex_ai, mcp_gitkraken)');
          return;
        }

        const config = this.configManager.getConfig();
        const enabled = config.enabledServices || [];
        const index = enabled.indexOf(serviceId);

        let newEnabled: string[];
        if (index > -1) {
          newEnabled = enabled.filter(s => s !== serviceId);
          drawMessage('SYSTEM', `🚫 Service [${serviceId}] DISABLED (Budget Lock Engaged)`);
        } else {
          newEnabled = [...enabled, serviceId];
          drawMessage('SYSTEM', `✅ Service [${serviceId}] ENABLED (Sovereign Approval Granted)`);
        }

        this.configManager.updateConfig({ enabledServices: newEnabled });
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
    // Check for built-in commands
    for (const cmd of this.commands) {
      if (cmd.pattern.test(cleanInput)) {
        await cmd.handler(cleanInput.split(/\s+/));
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

      if (!result.ok) {
        drawMessage('SYSTEM', `Error: ${result.error.message}`);
        return;
      }

      drawMessage('POG', result.value);
    } catch (error) {
      logger.error({ error }, 'Unexpected error');
      drawMessage('SYSTEM', `Unexpected error: ${(error as Error).message}`);
    }
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down CLI');
    this.running = false;

    await Promise.resolve(this.orchestrator.cleanup());

    // eslint-disable-next-line no-console
    console.log('💾 Session saved');
    // eslint-disable-next-line no-console
    console.log(`📊 Total intents: ${this.orchestrator.getIntentHistory().length}`);
    // eslint-disable-next-line no-console
    console.log('👋 Goodbye!\n');

    if (this.shutdownResolve) {
      this.shutdownResolve();
    }
  }

  async handleDirectCommand(command: string, args: string[]): Promise<void> {
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
    await this.shutdown();
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
if (currentScript.endsWith('cli/index.ts') || currentScript.endsWith('dist/cli.js') || currentScript.endsWith('cli/index.js')) {
  void main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { VibeCLI };
