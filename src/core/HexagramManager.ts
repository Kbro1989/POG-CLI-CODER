import { VectorDB } from '../learning/VectorDB.js';
import { Result } from './models.js';
import { HEXAGRAM_REGISTRY, DEFAULT_HEXAGRAM, HexagramDefinition } from './HexagramDefinitions.js';

export enum YaoState {
    OldYang = 0, // Moving Yang
    YoungYin = 1, // Stable Yin
    YoungYang = 2, // Stable Yang
    OldYin = 3    // Moving Yin
}

export interface ContextCard {
    lineIndex: number;
    title: string;
    content: string;
    importance: number;
    state: YaoState;
    updatedAt?: string;
}

export interface SystemState {
    buildPass: boolean;
    cloudHealthy: boolean;
    localModels: boolean;
    noRecentErrors: boolean;
    userActive: boolean;
    lowResourcePressure: boolean;
    /** Line 6: Dashboard/Preview/WebSocket health */
    dashboardHealthy?: boolean;
}

export class HexagramManager {
    private lines: ContextCard[] = [];
    private readonly projectId: string;

    private readonly FACET_MAP: Record<number, string> = {
        1: 'Foundation / Structural Roots',
        2: 'Interaction / Relationship with User',
        3: 'Transition / Current Activity',
        4: 'External Environment / Dependencies',
        5: 'Authority / Core Business Logic',
        6: 'Culmination / UI & User Perception'
    };

    constructor(private readonly vectorDB: VectorDB, projectId: string) {
        this.projectId = projectId;
    }

    async initialize(): Promise<void> {
        const result = await this.vectorDB.getHexagramContext(this.projectId);
        if (result.ok) {
            this.lines = result.value.map(row => ({
                lineIndex: row.lineIndex,
                title: row.title,
                content: row.content,
                importance: row.importance || 1,
                state: row.state as YaoState
            }));
        }

        // Ensure 6 lines exist
        while (this.lines.length < 6) {
            this.lines.push({
                lineIndex: this.lines.length + 1,
                title: 'Empty Slot',
                content: 'No context recorded for this pillar.',
                importance: 0,
                state: YaoState.YoungYang // Default Young Yang
            });
        }
    }

    async setLine(index: number, card: ContextCard): Promise<Result<void>> {
        if (index < 1 || index > 6) {
            return { ok: false, error: new Error('Invalid line index (1-6)') };
        }
        this.lines[index - 1] = card;
        return this.vectorDB.updateHexagramLine(index, this.projectId, card.title, card.content, card.state);
    }

    async getHexagramContext(): Promise<Result<ContextCard[]>> {
        return { ok: true, value: this.lines };
    }

    async pinCard(index: number, title: string, content: string, state: YaoState = YaoState.YoungYang): Promise<Result<void>> {
        if (index < 1 || index > 6) {
            return { ok: false, error: new Error('Invalid line index (1-6)') };
        }
        const card: ContextCard = { lineIndex: index, title, content, state, importance: 1 };

        // Persist to VectorDB for long-term Context Memory (Resilient)
        if (this.vectorDB) {
            try {
                // Fire and forget - do not await to avoid blocking critical metabolic loops
                void this.vectorDB.addLesson({
                    id: `hex_card_${Date.now()}_${index}`,
                    projectId: this.projectId,
                    sessionId: 'system',
                    text: `Hexagram Card [Line ${index}]: ${title} - ${content} (${YaoState[state]})`,
                    embedding: new Float32Array(768).fill(0), // Initialized state
                    createdAt: Date.now(),
                    metadata: { type: 'hexagram_card', line: index, state: YaoState[state] },
                    errorType: 'none'
                }).catch(() => { });
            } catch (e) {
                // Ignore synchronous errors
            }
        }

        return this.setLine(index, card);
    }

    /**
     * Dynamically casts the Hexagram based on real-time system state.
     * Maps operational metrics to the 6 Yao lines.
     */
    async updateLinesFromState(state: SystemState): Promise<void> {
        // Line 1: Foundation (Build Status)
        // Pass = Yang (Solid), Fail = Yin (Broken)
        await this.pinCard(1, 'Build Foundation', state.buildPass ? 'Build Passing' : 'Build Failing',
            state.buildPass ? YaoState.YoungYang : YaoState.YoungYin);

        // Line 2: Interaction (User Activity)
        // Active = Yang (Dynamic), Idle = Yin (Receptive)
        await this.pinCard(2, 'User Interaction', state.userActive ? 'User Active' : 'User Idle',
            state.userActive ? YaoState.YoungYang : YaoState.YoungYin);

        // Line 3: Transition (Recent Errors)
        // Stable = Yang, Errors = Yin (Conflict)
        await this.pinCard(3, 'System Stability', state.noRecentErrors ? 'Stable' : 'Recent Errors Detected',
            state.noRecentErrors ? YaoState.YoungYang : YaoState.OldYin); // Old Yin implies moving towards change

        // Line 4: Environment (Cloud/Resources)
        // Healthy = Yang, Degraded = Yin
        const resourceState = state.cloudHealthy && state.lowResourcePressure
            ? YaoState.YoungYang
            : YaoState.YoungYin;
        await this.pinCard(4, 'External Environment',
            state.cloudHealthy ? 'Cloud Nominal' : 'Resource Pressure/Degradation',
            resourceState);

        // Line 5: Authority (Local/Cloud Models)
        // Full Capacity = Yang, Partial = Yin
        await this.pinCard(5, 'Cognitive Authority',
            state.localModels ? 'Local Models Active' : 'Reliance on Cloud Only',
            state.localModels ? YaoState.YoungYang : YaoState.YoungYin);

        // Line 6: Culmination (Dashboard/UI/Preview Health)
        // Connected = Yang (Visible), Disconnected = Yin (Hidden)
        // If dashboardHealthy is undefined, we default to Yang (optimistic)
        const dashboardState = state.dashboardHealthy !== false
            ? YaoState.YoungYang
            : YaoState.OldYin; // Old Yin = moving towards recovery
        await this.pinCard(6, 'UI Culmination',
            state.dashboardHealthy !== false ? 'Dashboard Connected' : 'Dashboard Disconnected',
            dashboardState);
    }

    /**
     * Calculates the current I Ching Hexagram based on the 6 Yao states.
     * Returns a strategic definition capable of guiding agent behavior.
     */
    getInterpretation(): HexagramDefinition {
        const binaryId = this.calculateHexagramId(this.lines, false);
        const fallback: HexagramDefinition = {
            ...DEFAULT_HEXAGRAM,
            binary: binaryId,
            id: 0,
            name: 'Unknown Archetype',
            description: 'No interpretation found for this state.',
            strategy: 'MAINTAIN'
        };
        return HEXAGRAM_REGISTRY[binaryId] || fallback;
    }

    async formatForPrompt(queryEmbedding?: Float32Array): Promise<string> {
        const result = await this.getHexagramContext();
        if (!result.ok) return 'Hexagram context unavailable.';

        const cards = result.value;
        const metadata = this.getInterpretation();

        let output = '=== SOVEREIGN HEXAGRAM CONTEXT ===\n';
        output += `ARCHETYPE: ${metadata.name} (${metadata.binary})\n`;
        output += `MEANING: ${metadata.description}\n`;
        output += `> STRATEGIC DIRECTIVE: ${metadata.strategy}\n\n`;

        output += 'The following high-priority context cards are pinned to the active hexagram:\n\n';

        for (let i = 1; i <= 6; i++) {
            const card = cards.find(c => (c as any).lineIndex === i) || cards[i - 1];
            const facet = this.FACET_MAP[i];

            if (card) {
                const stateStr = this.getStateString((card as any).state);
                output += `Line ${i} [${facet}]:\n`;
                output += `TITLE: ${card.title}\n`;
                output += `STATE: ${stateStr}\n`;
                output += `CONTENT: ${card.content}\n\n`;
            } else {
                output += `Line ${i} [${facet}]: (Empty)\n\n`;
            }
        }

        // --- SEMANTIC MEMORY (Proactive RAG) ---
        if (queryEmbedding) {
            const similar = await this.vectorDB.searchSimilar(queryEmbedding, 5, this.projectId);
            if (similar.ok && similar.value.length > 0) {
                const currentProject = similar.value.filter(l => l.projectId === this.projectId);
                const crossProject = similar.value.filter(l => l.projectId !== this.projectId && l.projectId !== 'global');

                if (currentProject.length > 0) {
                    output += '=== SEMANTIC MEMORY (Active Project Lessons) ===\n';
                    output += 'The following historical patterns are relevant to the current intent:\n\n';
                    for (const lesson of currentProject) {
                        output += `[LESSON: ${lesson.metadata?.['type'] || 'General'}]\n`;
                        output += `CONTEXT: ${lesson['text'].substring(0, 500)}${lesson['text'].length > 500 ? '...' : ''}\n\n`;
                    }
                }

                if (crossProject.length > 0) {
                    output += '=== PROJECT CONSTELLATION (Cross-Project Knowledge) ===\n';
                    output += 'Highly relevant patterns identified from previous projects:\n\n';
                    for (const lesson of crossProject) {
                        output += `[SHORTCUT FROM PROJECT: ${lesson.projectId}]\n`;
                        output += `PATTERN: ${lesson['text'].substring(0, 500)}${lesson['text'].length > 500 ? '...' : ''}\n\n`;
                    }
                }
            }
        }

        const hasMoving = cards.some(c => (c as any).state === YaoState.OldYang || (c as any).state === YaoState.OldYin);

        if (hasMoving) {
            const futureId = this.calculateHexagramId(cards, true);
            const futureMeta = HEXAGRAM_REGISTRY[futureId] || { name: 'Unknown', strategy: 'Uncertainty' };
            output += `\n>> FUTURE TRANSITION: ${futureMeta.name}\n`;
            output += `>> FUTURE STRATEGY: ${futureMeta.strategy}\n`;
        }

        return output;
    }

    private getStateString(state: number): string {
        switch (state) {
            case YaoState.OldYang: return 'Old Yang (◯ Moving)';
            case YaoState.YoungYin: return 'Young Yin (⚋ Stable)';
            case YaoState.YoungYang: return 'Young Yang (⚊ Stable)';
            case YaoState.OldYin: return 'Old Yin (✕ Moving)';
            default: return 'Unknown';
        }
    }

    private calculateHexagramId(cards: any[], future: boolean): string {
        // Yang (1) = YoungYang (2) or OldYang (0)
        // Yin (0) = YoungYin (1) or OldYin (3)
        // If future is true, OldYang becomes Yin, OldYin becomes Yang.

        let binary = '';
        for (let i = 1; i <= 6; i++) {
            const card = cards.find(c => c.lineIndex === i) || cards[i - 1];
            const state = card ? card.state : 2; // Default to YoungYang if empty

            let isYang = (state === 0 || state === 2);
            if (future) {
                if (state === 0) isYang = false; // Old Yang -> Yin
                if (state === 3) isYang = true;  // Old Yin -> Yang
            }
            binary = (isYang ? '1' : '0') + binary; // Bottom to top
        }
        return binary;
    }
}
