import { z } from 'zod';
import type { Result } from './models.js';


/**
 * LimbTool - Standardized tool definition for POG agents.
 * Includes optional Zod schema for production-grade validation.
 */
export interface LimbTool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[] | readonly string[];
    };
    schema?: z.ZodObject<any>;
    handler: (args: Record<string, any>) => Promise<Result<unknown>>;
}

/**
 * ToolingSpine - Centralizes tool registration and routing for Limbs.
 */
export class ToolingSpine {
    private tools: Map<string, LimbTool> = new Map();

    /**
     * Register multiple tools at once.
     */
    registerTools(tools: LimbTool[]): void {
        for (const tool of tools) {
            this.tools.set(tool.name, tool);
        }
    }

    /**
     * Returns Google Gemini compatible tool declarations.
     */
    getGeminiDeclarations(): Array<{ functionDeclarations: Array<Record<string, unknown>> }> {
        const declarations = Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters as Record<string, unknown>
        }));

        return [{ functionDeclarations: declarations }];
    }

    /**
     * Routes a tool call to the registered handler with validation.
     */
    async handleCall(name: string, args: Record<string, any>): Promise<Result<unknown>> {
        const tool = this.tools.get(name);
        if (!tool) {
            return { ok: false, error: new Error(`Tool Spine: Unknown tool '${name}'`) };
        }

        let parsedArgs = args;

        // Perform Zod validation if schema is present
        if (tool.schema) {
            const validationResult = tool.schema.safeParse(args);
            if (!validationResult.success) {
                return {
                    ok: false,
                    error: new Error(`Validation Error [${name}]: ${JSON.stringify(validationResult.error.format())}`)
                };
            }
            // Use authenticated/parsed data
            parsedArgs = validationResult.data;
        }

        try {
            return await tool.handler(parsedArgs);
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    /**
     * Returns list of capability names.
     */
    getCapabilities(): string[] {
        return Array.from(this.tools.keys());
    }
}

