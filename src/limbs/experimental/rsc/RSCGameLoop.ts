// import { BaseLimb } from '../../core/BaseLimb.js'; // Kept for future use
import { Execution, Result } from '../../../core/models.js';
import { RSCLimb } from './RSCLimb.js';

export interface GameAction {
    type: 'walk' | 'talk_npc' | 'interact_object' | 'chat' | 'explore';
    params: Record<string, unknown>;
    reasoning: string;
}

export interface GameLoopConfig {
    username: string;
    password: string;
    model: string;
    maxActions: number;
    thinkDelay: number; // ms between actions
}

interface WorldState {
    player: { index: number; x: number; y: number; sprite: number };
    npcs: Array<{ id: number; index: number; x: number; y: number; sprite: number }>;
    players: Array<{ index: number; x: number; y: number; sprite: number }>;
    objects: Array<{ id: number; x: number; y: number }>;
}

/**
 * RSCGameLoop - Autonomous gameplay orchestrator using REAL server connection.
 * NO MOCKS - All data comes from actual RSC server packets.
 */
export class RSCGameLoop {
    constructor(
        private rscLimb: RSCLimb,
        private config: GameLoopConfig
    ) { }

    async start(): Promise<void> {
        console.log(`[RSC] Connecting to localhost:43594...`);

        // 1. Login to REAL server
        const loginResult = await this.rscLimb['login'](
            this.config.username,
            this.config.password
        );

        if (!loginResult.ok) {
            throw new Error(`Failed to login: ${loginResult.error}`);
        }

        console.log(`[RSC] ✓ Login successful! Agreed to chat rules.`);
        console.log('');

        // 2. Enter perception-decision-action loop
        for (let i = 0; i < this.config.maxActions; i++) {
            console.log(`[TURN ${i + 1}]`);

            const state = await this.perceive();
            const action = await this.decide(state);
            await this.act(action);

            console.log('');
            await this.delay(this.config.thinkDelay);
        }

        // 3. Disconnect gracefully
        console.log(`[Game Loop] Completed ${this.config.maxActions} actions. Disconnecting.`);
        await this.rscLimb.close();
        console.log('[RSC] ✓ Disconnected gracefully.');
    }

    private async perceive(): Promise<WorldState> {
        console.log('[AI] 🧠 Perceiving world...');

        // Get REAL world state from server packets
        // RSCLimb already maintains this from incoming packets
        const state = {
            player: this.rscLimb['state'].player,
            npcs: Array.from(this.rscLimb['state'].npcs.values()),
            players: Array.from(this.rscLimb['state'].players.values()),
            objects: this.rscLimb['state'].objects
        };

        console.log(`     Position: (${state.player.x}, ${state.player.y})`);
        console.log(`     NPCs: ${state.npcs.map(n => `NPC ${n.id} at (${n.x}, ${n.y})`).join(', ') || 'none'}`);
        console.log(`     Objects: ${state.objects.map(o => `Object ${o.id} at (${o.x}, ${o.y})`).join(', ') || 'none'}`);
        console.log(`     Players: ${state.players.length} nearby`);

        return state;
    }

    private async decide(state: WorldState): Promise<GameAction> {
        console.log(`[AI] 💭 Thinking... (using ${this.config.model})`);

        const prompt = this.buildDecisionPrompt(state);

        // Direct Ollama API call
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.config.model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 200
                }
            })
        });

        const data = await response.json() as { response: string };
        const action = this.parseAction(data.response);
        console.log(`[AI] ✓ Decision: ${action.type} ${JSON.stringify(action.params)} | REASON: ${action.reasoning}`);

        return action;
    }

    private async act(action: GameAction): Promise<Result<Execution>> {
        const actionDesc = this.formatAction(action);
        console.log(`[RSC] ${actionDesc}`);

        // Execute chosen action via REAL RSCLimb methods
        switch (action.type) {
            case 'walk':
                return this.rscLimb['walk'](action.params['x'] as number, action.params['y'] as number);
            case 'talk_npc':
                return this.rscLimb['interactNpc'](action.params['index'] as number, 'talk');
            case 'interact_object':
                return this.rscLimb['interactObject'](action.params['x'] as number, action.params['y'] as number);
            case 'chat':
                return this.rscLimb['chat'](action.params['message'] as string);
            case 'explore':
                // Random walk nearby
                const dx = Math.floor(Math.random() * 10) - 5;
                const dy = Math.floor(Math.random() * 10) - 5;
                const state = this.rscLimb['state'];
                return this.rscLimb['walk'](state.player.x + dx, state.player.y + dy);
            default:
                return { ok: false, error: new Error(`Unknown action type: ${action.type}`) };
        }
    }

    private buildDecisionPrompt(state: WorldState): string {
        return `You are an AI player in RuneScape Classic. Your goal is to explore, interact, and progress.

Current State:
- Position: (${state.player.x}, ${state.player.y})
- Nearby NPCs: ${state.npcs.map(n => `NPC ${n.id} at (${n.x}, ${n.y})`).join(', ') || 'none'}
- Nearby Objects: ${state.objects.map(o => `Object ${o.id} at (${o.x}, ${o.y})`).join(', ') || 'none'}
- Nearby Players: ${state.players.length} players

Available Actions:
1. walk <x> <y> - Move to coordinates (e.g., walk 220 745)
2. talk_npc <index> - Talk to NPC by index (e.g., talk_npc 5)
3. interact_object <x> <y> - Interact with object at coordinates
4. chat <message> - Send chat message
5. explore - Walk to random nearby location

Choose ONE action and explain your reasoning briefly.
Format: ACTION: <action> | REASON: <reasoning>

Example: ACTION: walk 220 745 | REASON: Exploring nearby area to discover new NPCs`;
    }

    private parseAction(response: string): GameAction {
        // Parse format: "ACTION: walk 220 745 | REASON: Exploring nearby area"
        const match = response.match(/ACTION:\s*(\w+)\s*([^|]*)\s*\|\s*REASON:\s*(.+)/i);

        if (!match) {
            // Fallback to explore if parsing fails
            return {
                type: 'explore',
                params: {},
                reasoning: 'Failed to parse action, exploring randomly'
            };
        }

        const actionType: string = match[1] ?? 'explore';
        const paramsStr: string = match[2] ?? '';
        const reasoning: string = match[3] ?? 'No reasoning provided';
        const params = this.parseParams(actionType, paramsStr.trim());

        return {
            type: actionType as GameAction['type'],
            params,
            reasoning: reasoning.trim()
        };
    }

    private parseParams(actionType: string, paramsStr: string): Record<string, unknown> {
        const parts = paramsStr.split(/\s+/).filter(p => p);

        switch (actionType) {
            case 'walk':
                return { x: parseInt(parts[0] || '0') || 0, y: parseInt(parts[1] || '0') || 0 };
            case 'talk_npc':
                return { index: parseInt(parts[0] || '0') || 0 };
            case 'interact_object':
                return { x: parseInt(parts[0] || '0') || 0, y: parseInt(parts[1] || '0') || 0 };
            case 'chat':
                return { message: paramsStr };
            default:
                return {};
        }
    }

    private formatAction(action: GameAction): string {
        switch (action.type) {
            case 'walk':
                return `🚶 Walking to (${action.params['x']}, ${action.params['y']})...`;
            case 'talk_npc':
                return `🗣️ Talking to NPC index ${action.params['index']}...`;
            case 'interact_object':
                return `👆 Interacting with object at (${action.params['x']}, ${action.params['y']})...`;
            case 'chat':
                return `💬 Chatting: "${action.params['message']}"`;
            case 'explore':
                return `🧭 Exploring randomly...`;
            default:
                return `❓ Unknown action: ${action.type}`;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
