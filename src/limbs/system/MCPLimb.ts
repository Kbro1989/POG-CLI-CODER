import { z } from 'zod';
import { BaseLimb } from '../core/BaseLimb.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { type Result, type VibeConfig } from '../../core/models.js';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Intent, TernaryDecision } from '../core/NeuralLimb.js';

interface MCPServerConfig {
    command: string;
    args: string[];
    env?: Record<string, string>;
}

interface MCPContent {
    type: string;
    text?: string;
    data?: unknown;
}

/**
 * MCPLimb - High-Fidelity Universal Model Context Protocol Substrate.
 * 
 * Leverages the official @modelcontextprotocol/sdk for real, non-mocked
 * integration with any standard MCP server.
 */
export class MCPLimb extends BaseLimb {
    readonly id = 'mcp_extension';
    readonly type = 'action';
    private readonly clients: Map<string, Client> = new Map();

    constructor(config: VibeConfig) {
        super(config);
        this.registerMcpTools();
        // initializeServers moved to lazy or explicit call to avoid EPIPE in restricted environments
    }

    private registerMcpTools(): void {
        this.registerTools([
            {
                name: 'connect_mcp_server',
                description: 'Manually bridge a new MCP server via stdio.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Neural link name.' },
                        command: { type: 'string', description: 'Binary command.' },
                        args: { type: 'array', items: { type: 'string' }, description: 'Args.' }
                    },
                    required: ['name', 'command']
                },
                schema: z.object({
                    name: z.string(),
                    command: z.string(),
                    args: z.array(z.string()).optional()
                }),
                handler: async (args: Record<string, unknown>) => {
                    await this.connectToServer(args['name'] as string, {
                        command: args['command'] as string,
                        args: args['args'] as string[] || []
                    });
                    return { ok: true, value: { status: 'synchronized' } };
                }
            }
        ]);
    }

    public initializeServers(): void {
        const configPath = join(this.config.projectRoot, 'pog-mcp.json');
        if (!existsSync(configPath)) {
            this.logger.info('No pog-mcp.json found. Substrate limited to native organs.');
            return;
        }

        try {
            const mcpConfig = JSON.parse(readFileSync(configPath, 'utf8'));
            const servers = mcpConfig.mcpServers || {};

            for (const [name, config] of Object.entries(servers)) {
                void this.connectToServer(name, config as MCPServerConfig);
            }
        } catch (e) {
            this.logger.error({ error: (e as Error).message }, 'Failed to parse pog-mcp.json');
        }
    }

    private async connectToServer(name: string, config: MCPServerConfig): Promise<void> {
        this.logger.info({ server: name, command: config.command }, '🔌 Engaging MCP Neural Link...');

        try {
            const transport = new StdioClientTransport({
                command: config.command,
                args: config.args,
                env: { ...process.env, ...config.env } as Record<string, string>
            });

            // Using explicit casting for Client options to bypass SDK version strictness
            const client = new Client(
                {
                    name: "pog-coder-vibe",
                    version: "1.0.0"
                },
                {
                    capabilities: {
                        tools: {}
                    }
                } as any
            );

            await client.connect(transport);
            this.clients.set(name, client);

            // 1. Discover Tools (Safe Discovery)
            try {
                const toolsRes = await client.listTools();
                const tools = toolsRes.tools || [];

                const formattedTools = tools.map((t) => ({
                    name: `mcp_${name}_${t.name}`,
                    description: `[MCP:${name}] ${t.description}`,
                    parameters: t.inputSchema as { type: 'object'; properties: Record<string, unknown>; required?: string[] },
                    handler: async (args: Record<string, unknown>): Promise<Result<unknown>> => {
                        try {
                            const result = await client.callTool({
                                name: t.name,
                                arguments: args
                            });

                            if (result.isError) {
                                const errorText = (result.content as MCPContent[]).map((c) => c.text || JSON.stringify(c)).join('\n');
                                return { ok: false, error: new Error(errorText) };
                            }

                            const output = (result.content as MCPContent[]).map((c) => c.text || JSON.stringify(c)).join('\n') || 'Success';
                            return { ok: true, value: output };
                        } catch (err) {
                            return { ok: false, error: err as Error };
                        }
                    }
                }));

                this.registerTools(formattedTools);
                this.logger.info({ server: name, tools: tools.length }, '✅ MCP Tools Bonded');
            } catch (err) {
                this.logger.debug({ server: name, error: (err as Error).message }, 'MCP: Server does not support tools discovery');
            }

            // 2. Discover Resources (Fidelity Upgrade - Optional)
            try {
                const resourcesRes = await client.listResources();
                if (resourcesRes.resources.length > 0) {
                    this.logger.info({ server: name, count: resourcesRes.resources.length }, '📚 MCP Resources Bonded');
                }
            } catch (err) {
                this.logger.debug({ server: name, error: (err as Error).message }, 'MCP: Server does not support resources discovery');
            }

            this.logger.info({ server: name }, '✅ MCP Neural Link Synchronized');

        } catch (err) {
            this.logger.error({ server: name, error: (err as Error).message }, '❌ MCP Neural Link Failure');
        }
    }

    /**
     * Standard canHandle using Ternary logic.
     * Escalates only when MCP-specific tools or the server IDs are mentioned.
     */
    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = this.getUserIntent(intent).toLowerCase();

        // Check if any active server name is mentioned
        for (const name of this.clients.keys()) {
            if (p.includes(name.toLowerCase())) return 'Yang';
        }

        // Standard de-escalation for general queries
        return super.canHandle(intent);
    }

    /**
     * Proper Close: Ensures all MCP Neural Links are cleanly severed.
     */
    public override async close(): Promise<void> {
        this.logger.info({ connections: this.clients.size }, 'Severing MCP Neural Links...');
        for (const [name, client] of this.clients.entries()) {
            try {
                await client.close();
                this.logger.debug({ server: name }, 'Neural link offline');
            } catch (e) {
                this.logger.error({ server: name, error: (e as Error).message }, 'Failed to close neural link');
            }
        }
        this.clients.clear();
    }

    /**
     * Diagnostic hook for Dashboard
     */
    override getStatus(): Record<string, unknown> {
        const status = super.getStatus();
        return {
            ...status,
            activeConnections: this.clients.size,
            servers: Array.from(this.clients.keys())
        };
    }
}
