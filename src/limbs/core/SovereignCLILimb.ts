import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { Sandbox } from '../../sandbox/Sandbox.js';
import { FileSystemSpine, ShellSpine, SmartEditorSpine } from '../../spines/index.js';

/**
 * SovereignCLILimb - Unified CLI & Editor Toolset Aggregator.
 * 
 * Bundles:
 * - FileSystemSpine (Atomic FS operations)
 * - ShellSpine (Sovereign shell execution)
 * - SmartEditorSpine (High-fidelity code editing)
 */
export class SovereignCLILimb extends BaseLimb {
    readonly id = 'sovereign_cli';
    readonly type = 'action' as const;

    private readonly fsSpine: FileSystemSpine;
    private readonly shellSpine: ShellSpine;
    private readonly editorSpine: SmartEditorSpine;

    constructor(
        config: VibeConfig,
        sandbox: Sandbox
    ) {
        super(config);
        this.fsSpine = new FileSystemSpine(config, sandbox);
        this.shellSpine = new ShellSpine(config);
        this.editorSpine = new SmartEditorSpine(config, sandbox);

        this.registerUnifiedTools();
    }

    private registerUnifiedTools(): void {
        this.registerSpine(this.fsSpine.getTools());
        this.registerSpine(this.shellSpine.getTools());
        this.registerSpine(this.editorSpine.getTools());
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = this.getUserIntent(intent).toLowerCase();

        // High priority for direct tool names or CLI/Shell keywords
        if (p.includes('fs_') || p.includes('sh_') || p.includes('edit_') || p.includes('shell') || p.includes('terminal')) {
            return 'Yang';
        }

        const matches = this.capabilities.filter(cap => p.includes(cap.toLowerCase())).length;
        if (matches >= 1) return 'YinYang';

        return 'Yin';
    }

    override async execute(_intent: Intent): Promise<Result<Execution>> {
        // This limb typically operates via handleToolCall dispatch.
        // If reached directly, provide the list of capabilities.
        return {
            ok: true,
            value: {
                output: `Sovereign CLI active. Capabilities: ${this.capabilities.join(', ')}`,
                data: { id: this.id, tools: this.capabilities }
            }
        };
    }

    override getTools(): import('./NeuralLimb.js').ToolDeclaration[] {
        const tools = super.getTools();
        tools.push({
            functionDeclarations: [{
                name: 'check_objective_progress',
                description: 'Reads the specific objectives.md file to interpret current project status and progress.',
                parameters: { type: 'OBJECT', properties: {}, required: [] }
            }]
        });
        return tools;
    }

    override async handleToolCall(name: string, args: Record<string, unknown>): Promise<Result<Execution>> {
        if (name === 'check_objective_progress') {
            try {
                const fs = await import('fs');
                const path = await import('path');
                const objPath = path.resolve(this.config.projectRoot, 'objectives.md');

                if (!fs.existsSync(objPath)) {
                    return { ok: true, value: { output: 'No objectives.md found.' } };
                }

                const content = fs.readFileSync(objPath, 'utf8');
                return { ok: true, value: { output: content } };
            } catch (e) {
                return { ok: false, error: e as Error };
            }
        }

        return super.handleToolCall(name, args);
    }

    override async close(): Promise<void> {
        await this.shellSpine.close();
    }
}
