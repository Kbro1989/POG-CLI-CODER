import { FreeOrchestrator } from '../src/core/Orchestrator.js';
import { VibeConfig } from '../src/core/models.js';
import { join } from 'path';
import { homedir } from 'os';
import { ASTWatcher } from '../src/watcher/ASTWatcher.js';
import { VectorDB } from '../src/learning/VectorDB.js';
import { Sandbox } from '../src/sandbox/Sandbox.js';

describe('Standardized Pipeline Integration', () => {
    let orchestrator: FreeOrchestrator;
    const config: VibeConfig = {
        projectId: 'test-project',
        rootStack: [], projectRoot: process.cwd(),
        agentName: 'POG-Test',
        pogDir: join(homedir(), '.pog_test'),
        wsPort: 8766,
        maxSnapshotAge: 86400,
        circuitBreakerThreshold: 3,
        circuitBreakerCooldown: 30000,
        embeddingDimensions: 768,
        enabledServices: ['gemini', 'ollama'],
        logLevel: 'info',
        gutenbergPath: undefined,
        workspaces: [process.cwd()],
        environment: 'local',
        pogApiUrl: undefined,
        aiContextPath: undefined
    };

    beforeAll(async () => {
        const watcher = new ASTWatcher(config);
        watcher.initialize(); // Non-blocking but necessary for setup

        const vectorDB = new VectorDB(config);
        await vectorDB.initialize();

        const sandbox = new Sandbox(config);
        orchestrator = new FreeOrchestrator(config, watcher, vectorDB, sandbox);
    });

    test('Aggregate tools from multiple limbs', () => {
        const tools = (orchestrator as any).getAllAvailableTools();
        expect(tools.length).toBeGreaterThan(0);

        // Verify tools from different limbs are present
        const toolNames = tools.flatMap((t: any) => t.functionDeclarations.map((f: any) => f.name));

        expect(toolNames).toContain('scaffold_project');
        expect(toolNames).toContain('setup_database');
        expect(toolNames).toContain('imagen_v4_generation');
        expect(toolNames).toContain('medgemma_reasoning');
        expect(toolNames).toContain('gutenberg_search');
    });

    test('Aggregate Control Plane tools', () => {
        const tools = (orchestrator as any).getControlPlaneTools();
        const toolNames = tools.flatMap((t: any) => t.functionDeclarations.map((f: any) => f.name));

        expect(toolNames).toContain('plan_tool_execution');
        expect(toolNames).toContain('route_model');
        expect(toolNames).toContain('evaluate_result');
        expect(toolNames).toContain('manage_durable_memory');
        expect(toolNames).toContain('emit_execution_manifest');
        expect(toolNames).toContain('cloud_shell_cognitive_assist');
        expect(toolNames).toContain('manage_event_triggers');
    });

    test('Route tool call to Orchestrator (Internal)', async () => {
        const turnResult = await (orchestrator as any).processFunctionCalls({
            response: 'Testing internal routing',
            model: 'gemini-flash',
            latency: 100,
            functionCalls: [{
                name: 'route_model',
                args: { taskType: 'architecture', reason: 'test' }
            }]
        });

        expect(turnResult.status).toBe('continue');
    });

    test('Route tool call to WebAppForgeLimb', async () => {
        const result = await (orchestrator as any).processFunctionCalls({
            response: '',
            model: 'test-model',
            latency: 0,
            functionCalls: [{
                name: 'scaffold_project',
                args: { projectName: 'test-app', stack: 'nextjs' }
            }]
        });

        // The result is an AgentTurnResult object, checking status/value
        expect(result.status).toBe('continue');
    });

    test('Route tool call to MediaForgeLimb', async () => {
        const result = await (orchestrator as any).processFunctionCalls({
            response: '',
            model: 'test-model',
            latency: 0,
            functionCalls: [{
                name: 'imagen_v4_generation',
                args: { prompt: 'a cybernetic raven in a neon forest' }
            }]
        });

        expect(result.status).toBe('continue');
    });

    test('Route tool call to BioIntelligenceLimb', async () => {
        const result = await (orchestrator as any).processFunctionCalls({
            response: '',
            model: 'test-model',
            latency: 0,
            functionCalls: [{
                name: 'medgemma_reasoning',
                args: { prompt: 'Analyze potential drug interactions for patient A' }
            }]
        });

        expect(result.status).toBe('continue');
    });

    test('Route tool call to GutenbergLimb', async () => {
        const result = await (orchestrator as any).processFunctionCalls({
            response: '',
            model: 'test-model',
            latency: 0,
            functionCalls: [{
                name: 'gutenberg_search',
                args: { search: 'The Art of War', limit: 1 }
            }]
        });

        expect(result.status).toBe('continue');
    });

    afterAll(async () => {
        if (orchestrator) {
            await orchestrator.cleanup();
        }
    });
});

