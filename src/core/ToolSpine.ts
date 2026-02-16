import type { LimbTool } from './models.js';

/**
 * ToolSpine - Deterministic Tools (IO, FS, DB)
 * NO AI DEPENDENCY internally.
 */
export class ToolSpine {
    private readonly tools: Map<string, LimbTool> = new Map();

    public register(tool: LimbTool): void {
        this.tools.set(tool.name, tool);
    }

    public get(name: string): LimbTool | undefined {
        return this.tools.get(name);
    }

    public getAll(): LimbTool[] {
        return Array.from(this.tools.values());
    }

    public getTools(): LimbTool[] {
        return this.getAll();
    }

    public getCapabilities(): string[] {
        return this.getAll().map(t => t.description);
    }

    public clear(): void {
        this.tools.clear();
    }
}
