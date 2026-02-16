import { EventEmitter } from 'events';
import { VectorDB } from '../learning/VectorDB.js';
import { Result, BuildStatus, HealthStatus, ResourcePressure, UserEngagement, YaoState, Lesson } from './models.js';
import { HEXAGRAM_REGISTRY, DEFAULT_HEXAGRAM, HexagramDefinition } from './HexagramDefinitions.js';
import { logger } from '../utils/logger.js';


// DB Row shape validation
interface HexagramRow {
    lineIndex: number;
    title: string;
    content: string;
    importance: number;
    state: number;
}

export interface ContextCard {
    lineIndex: number;
    title: string;
    content: string;
    importance: number;
    state: YaoState;
    emotion?: import('./models.js').EmotionalState;
    updatedAt?: string;
}

export interface SystemState {
    buildPass: BuildStatus;
    cloudHealthy: HealthStatus;
    localModels: HealthStatus;
    noRecentErrors: HealthStatus;
    userActive: UserEngagement;
    lowResourcePressure: ResourcePressure;
    /** Line 5: Admin (Kimi) presence */
    adminPresent?: boolean;
    /** Line 6: Dashboard/Preview/WebSocket health */
    dashboardHealthy?: HealthStatus;
    /** Line 1 augmentation: Somatic Lair (D:\sovereign) availability */
    somaticLair?: boolean;
}

export class HexagramManager extends EventEmitter {
    private lines: ContextCard[] = [];
    private readonly projectId: string;

    private readonly FACET_MAP: Record<number, string> = {
        1: 'Foundation / Structural Roots',
        2: 'Biological Pulse / System Vitality',
        3: 'Transition / Current Activity',
        4: 'External Environment / Dependencies',
        5: 'Authority / Core Business Logic',
        6: 'Culmination / UI & User Perception'
    };

    constructor(private readonly vectorDB: VectorDB, projectId: string) {
        super();
        this.projectId = projectId;
    }



    async initialize(): Promise<void> {
        const result = await this.vectorDB.getHexagramContext(this.projectId);
        if (result.ok) {
            const rows = (result.value as unknown as HexagramRow[]) || [];
            this.lines = rows
                .filter(row => !!row)
                .map((row) => ({
                    lineIndex: row.lineIndex || 0,
                    title: row.title || 'Untitled',
                    content: row.content || '',
                    importance: row.importance || 1,
                    state: (row.state as YaoState) || YaoState.YoungYang
                }))
                .filter(l => l.lineIndex >= 1 && l.lineIndex <= 6);
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

    /**
     * Pins a cognitive thought card to the hexagram.
     * Maps to the 9-node Sense-Think-Act-Reflect loop.
     */
    async pinCognitiveCard(index: number, title: string, content: string, state: YaoState = YaoState.YoungYang): Promise<Result<void>> {
        if (index < 1 || index > 6) {
            return { ok: false, error: new Error('Invalid line index (1-6)') };
        }

        const emotion = this.getEmotionForState(state);
        const card: ContextCard = {
            lineIndex: index,
            title: `[COGNITION] ${title}`,
            content,
            state,
            emotion,
            importance: 2 // Higher importance for cognitive cards
        };

        // Persist to Semantic Memory (Contextual Persistence)
        if (this.vectorDB) {
            void this.vectorDB.addLesson({
                id: `cog_${Date.now()}_${index}`,
                projectId: this.projectId,
                sessionId: 'cognition',
                text: `Cognitive Placecard [Line ${index}]: ${title} -> ${content} [EMOTION: ${emotion}]`,
                embedding: new Float32Array(768).fill(0),
                createdAt: Date.now(),
                metadata: { type: 'cognition_card', line: index, state: YaoState[state], emotion },
                errorType: 'none'
            }).catch(() => { });
        }

        const result = await this.setLine(index, card);
        if (result.ok) {
            this.emit('cardPinned', { index, card });
        }
        return result;
    }

    /**
     * Procedural mapping from Yao states to Emotional States.
     */
    public getEmotionForState(state: YaoState): import('./models.js').EmotionalState {
        const { EmotionalState } = require('./models.js');
        switch (state) {
            case YaoState.OldYang: return EmotionalState.Decisive;
            case YaoState.YoungYang: return EmotionalState.Steady;
            case YaoState.YoungYin: return EmotionalState.Quiet;
            case YaoState.OldYin: return EmotionalState.Melancholy;
            case YaoState.Transition: return EmotionalState.Surprised;
            case YaoState.All: return EmotionalState.Zen;
            default: return EmotionalState.Curious;
        }
    }

    /**
     * Emits a high-frequency pulse to the dashboard visualizer.
     * Maps to real-time substrate metabolic state (OldYang/OldYin).
     */
    async pinPulse(state: YaoState, message: string): Promise<void> {
        const emotion = this.getEmotionForState(state);
        this.emit('pulse', { state, message, emotion, timestamp: Date.now() });

        // Log pulse as a transient memory if significant
        if (state === YaoState.OldYang || state === YaoState.OldYin) {
            logger.debug({ state, message, emotion }, 'System Metabolic Pulse');
        }
    }

    async getHexagramContext(): Promise<Result<ContextCard[]>> {
        return { ok: true, value: this.lines };
    }

    /**
     * Get lines synchronously for UI/CLI consumption.
     */
    getLines(): ContextCard[] {
        return [...this.lines];
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

        const result = await this.setLine(index, card);
        if (result.ok) {
            this.emit('cardPinned', { index, card });
        }
        return result;
    }

    /**
     * Dynamically casts the Hexagram based on real-time system state.
     * Maps operational metrics to the 6 Yao lines.
     */
    async updateLinesFromState(state: SystemState): Promise<void> {
        const { SovereignTaxonomy } = require('./models.js');

        // Line 1: Foundation (Build Status)
        const buildInfo = SovereignTaxonomy.BuildStatus[state.buildPass] || SovereignTaxonomy.BuildStatus['Yin'];
        let buildYao = buildInfo.state;

        // Somatic Augmentation: If Lair is missing, Line 1 becomes Yin (Broken Foundation)
        if (state.somaticLair === false && buildYao === YaoState.YoungYang) {
            buildYao = YaoState.OldYin; // Foundation is undergoing critical stress/dislocation
        }

        await this.pinCard(1, 'Somatic Foundation',
            `${state.somaticLair === false ? 'Lair Disconnected' : buildInfo.meaning} [${buildInfo.symbol}]`,
            buildYao);

        // Line 3: Transition (Recent Errors)
        const stabilityInfo = SovereignTaxonomy.HealthStatus[state.noRecentErrors] || SovereignTaxonomy.HealthStatus['Yin'];
        await this.pinCard(3, 'System Stability',
            `${stabilityInfo.meaning} [${stabilityInfo.symbol}]`,
            stabilityInfo.state);

        // Line 4: Environment (Cloud/Resources)
        const resourceInfo = SovereignTaxonomy.ResourcePressure[state.lowResourcePressure] || SovereignTaxonomy.ResourcePressure['Yin'];
        await this.pinCard(4, 'External Environment',
            `${state.cloudHealthy === HealthStatus.Ready ? 'Cloud Nominal' : 'Substrate Burdened'} [${resourceInfo.symbol}]`,
            resourceInfo.state);

        // Line 5: Authority (Local/Models)
        let cognitiveYao = YaoState.YoungYang;
        if (state.adminPresent === false) {
            cognitiveYao = YaoState.YoungYin;
        } else if (state.localModels === HealthStatus.Critical) {
            cognitiveYao = YaoState.YoungYin;
        }

        await this.pinCard(5, 'Cognitive Authority',
            state.adminPresent === false ? 'Sovereign Silence: Admin Absent' : (state.localModels === HealthStatus.Ready ? 'Local Models Active' : 'Reliance on Cloud Only'),
            cognitiveYao);

        // Line 6: Culmination (Dashboard/UI)
        const dashboardInfo = SovereignTaxonomy.HealthStatus[state.dashboardHealthy || 'Yin'];
        await this.pinCard(6, 'UI Culmination',
            `${dashboardInfo.meaning} [${dashboardInfo.symbol}]`,
            dashboardInfo.state);
    }

    /**
     * Calculates the current I Ching Hexagram based on the 6 Yao states.
     * Returns a strategic definition capable of guiding agent behavior.
     */
    getInterpretation(): HexagramDefinition {
        const binaryId = this.calculateHexagramId(this.lines, false);
        const { EmotionalState } = require('./models.js');
        const fallback: HexagramDefinition = {
            ...DEFAULT_HEXAGRAM,
            binary: binaryId,
            id: 0,
            name: 'Unknown Archetype',
            description: 'No interpretation found for this state.',
            strategy: 'MAINTAIN',
            emotion: EmotionalState.Curious
        };
        return HEXAGRAM_REGISTRY[binaryId] || fallback;
    }

    async formatForPrompt(queryEmbedding?: Float32Array): Promise<string> {
        const result = await this.getHexagramContext();
        if (!result.ok) return 'Hexagram context unavailable.';

        const cards = result.value;
        const metadata = this.getInterpretation();

        let output = '=== SOVEREIGN TEAM CONSENSUS (I CHING SUBSTRATE) ===\n';
        output += `ARCHETYPE: ${metadata.name} (${metadata.binary})\n`;
        output += `MEANING: ${metadata.description}\n`;
        output += `EMOTIONAL RESONANCE: ${metadata.emotion}\n`;
        output += `> STRATEGIC DIRECTIVE: ${metadata.strategy}\n\n`;

        output += 'The following high-priority context cards are pinned to the active hexagram:\n\n';

        for (let i = 1; i <= 6; i++) {
            const card = (cards || []).find(c => c && c.lineIndex === i) || (cards ? cards[i - 1] : null);
            const facet = this.FACET_MAP[i];

            if (card) {
                const stateStr = this.getStateString(card.state ?? YaoState.YoungYang);
                output += `Line ${i} [${facet}]:\n`;
                output += `TITLE: ${card.title || 'Untitled'}\n`;
                output += `STATE: ${stateStr} [EMOTION: ${card.emotion || 'UNKNOWN'}]\n`;
                output += `CONTENT: ${card.content || ''}\n\n`;
            } else {
                output += `Line ${i} [${facet}]: (Empty)\n\n`;
            }
        }

        // --- SEMANTIC MEMORY (Proactive RAG) ---
        if (queryEmbedding) {
            const similar = await this.vectorDB.searchSimilar(queryEmbedding, 5, this.projectId);
            if (similar.ok && similar.value.length > 0) {
                const currentProject = similar.value.filter((l: Lesson) => l.projectId === this.projectId);
                const crossProject = similar.value.filter((l: Lesson) => l.projectId !== this.projectId && l.projectId !== 'global');

                if (currentProject.length > 0) {
                    output += '=== SEMANTIC MEMORY (Active Project Lessons) ===\n';
                    output += 'The following historical patterns are relevant to the current intent:\n\n';
                    for (const lesson of currentProject) {
                        output += `[LESSON: ${lesson.metadata?.['type'] || 'General'}]\n`;
                        output += `CONTEXT: ${lesson['text'].substring(0, 500)}${lesson['text'].length > 500 ? '...' : ''}\n\n`;
                    }
                }

                if (crossProject.length > 0) {
                    output += '=== PROJECT CONSTELLATION (Cross-Workspace Semantic Memory) ===\n';
                    output += 'The following high-fidelity patterns have been identified from other sovereign workspaces:\n\n';
                    for (const lesson of crossProject) {
                        output += `[SHORTCUT FROM PROJECT: ${lesson.projectId}]\n`;
                        output += `PATTERN: ${lesson['text'].substring(0, 600)}${lesson['text'].length > 600 ? '...' : ''}\n\n`;
                    }
                    output += '>> Acknowledge these patterns in your reasoning if they prevent regression or provide optimal shortcuts.\n\n';
                }
            }
        }

        const hasMoving = cards.some(c => c.state === YaoState.OldYang || c.state === YaoState.OldYin);

        if (hasMoving) {
            const futureId = this.calculateHexagramId(cards, true);
            const futureMeta = HEXAGRAM_REGISTRY[futureId] || { name: 'Unknown', strategy: 'Uncertainty' };
            output += `\n>> FUTURE TRANSITION: ${futureMeta.name}\n`;
            output += `>> FUTURE STRATEGY: ${futureMeta.strategy}\n`;
        }

        return output;
    }

    public getStateString(state: number): string {
        switch (state) {
            case YaoState.OldYang: return 'Old Yang (◯ Moving)';
            case YaoState.YoungYin: return 'Young Yin (⚋ Stable)';
            case YaoState.YoungYang: return 'Young Yang (⚊ Stable)';
            case YaoState.OldYin: return 'Old Yin (✕ Moving)';
            default: return 'Unknown';
        }
    }


    /**
     * Sovereign Oracle: The 3 Questions (Tri-Axis)
     * 
     * Generates a Hexagram by recursively evaluating 6 options against 3 dynamic axes.
     * @param query The intent and dimensional axes (X, Y, Z)
     * @param modelExecutor Executor for high-fidelity thought generation
     */
    async consultOracle(query: import('./models.js').OracleQuery, modelExecutor: import('./ModelExecutor.js').ModelExecutor): Promise<Result<HexagramDefinition>> {
        // 0. Gather Context (State Awareness)
        const currentContext = await this.formatForPrompt();

        // 1. Generate 6 Options (if not provided)
        let candidates = query.candidates || [];
        if (candidates.length < 6) {
            const prompt = `
            SOVEREIGN ORACLE GENERATION
            Intent: "${query.intent}"
            
            CURRENT SYSTEM STATE (The Being's Context):
            ${currentContext}
            
            Generate 6 distinct strategic options or perspectives that address this intent.
            Each option must be a complete thought or potential action.
            Format: JSON array of strings.
            `;
            const result = await modelExecutor.callModel('gemini-1.5-flash', prompt);
            if (result.ok && result.value.response) {
                try {
                    const parsed = JSON.parse(result.value.response.replace(/```json|```/g, '').trim());
                    if (Array.isArray(parsed)) candidates = parsed.slice(0, 6);
                } catch (e) {
                    candidates = [
                        "Maintain current trajectory",
                        "Aggressive expansion",
                        "Strategic retreat / consolidation",
                        "Diplomatic negotiation",
                        "Subversive innovation",
                        "Radical transformation"
                    ];
                }
            }
        }

        // 2. Evaluate Each Option against the 3 Axes (Ternary Tri-Axis Logic: 3x 6x 3x)
        // Each Axis result is Ternary: Yang (3), Yin (2), or Yao (2.5)
        // Calculation: Sum of 3 Axis results (Ternary) maps to a Yao State.
        // - 9.0: Old Yang (Moving)
        // - 6.0: Old Yin (Moving)
        // - 7.5: Yao (Neutral/Stable)
        // - 7.0: Young Yang (Stable)
        // - 8.0: Young Yin (Stable)

        const newLines: ContextCard[] = [];

        for (let i = 0; i < 6; i++) {
            const option = candidates[i] || `Option ${i + 1}`;

            const checkAxis = async (axisIndex: number): Promise<number> => {
                const axis = query.axes[axisIndex];
                if (!axis) return 2.5; // Neutral Yao fallback
                const prompt = `Evaluate option "${option}" against Axis ${axis.axis}: ${axis.positive} (Yang) vs ${axis.negative} (Yin). 
                If it strongly aligns with positive, respond "Yang".
                If it strongly aligns with negative, respond "Yin".
                If it is balanced, neutral, or in transition, respond "Yao".
                Respond ONLY with: Yang, Yin, or Yao.`;

                const res = await modelExecutor.callModel('gemini-1.5-flash', prompt);
                const val = res.ok ? res.value.response.trim().toLowerCase() : 'yao';
                if (val.includes('yang')) return 3;
                if (val.includes('yin')) return 2;
                return 2.5; // Yao state
            };

            const xVal = await checkAxis(0);
            const yVal = await checkAxis(1);
            const zVal = await checkAxis(2);

            const score = xVal + yVal + zVal;
            let state = YaoState.YoungYang;

            // Simplified Ternary Decision Mesh:
            if (score === 9) state = YaoState.OldYang;
            else if (score === 6) state = YaoState.OldYin;
            else if (score >= 7.5 && score < 8.5) state = YaoState.YoungYin; // Weighted toward Yin/Balanced
            else if (score >= 6.5 && score < 7.5) state = YaoState.YoungYang; // Weighted toward Yang/Balanced
            else state = YaoState.YoungYang; // Default

            // Pin to memory
            const lineIndex = i + 1;
            const card: ContextCard = {
                lineIndex,
                title: option.substring(0, 50),
                content: `Tri-Axis Analysis (3x 6x 3x):\nOption: ${option}\nResults: X=${xVal}, Y=${yVal}, Z=${zVal} (Score: ${score})`,
                state,
                importance: 3
            };

            newLines.push(card);
            await this.setLine(lineIndex, card);
        }

        // 3. Return Interpretation
        return { ok: true, value: this.getInterpretation() };
    }

    private calculateHexagramId(cards: ContextCard[], future: boolean): string {
        // Yang (1) = YoungYang (2) or OldYang (0)
        // Yin (0) = YoungYin (1) or OldYin (3)
        // If future is true, OldYang becomes Yin, OldYin becomes Yang.

        let binary = '';
        for (let i = 1; i <= 6; i++) {
            const card = (cards || []).find(c => c && c.lineIndex === i) || (cards ? cards[i - 1] : null);
            const state = card ? (card.state ?? YaoState.YoungYang) : YaoState.YoungYang;

            let isYang = (state === YaoState.OldYang || state === YaoState.YoungYang);
            if (future) {
                if (state === YaoState.OldYang) isYang = false; // Old Yang -> Yin
                if (state === YaoState.OldYin) isYang = true;  // Old Yin -> Yang
            }
            binary = (isYang ? '1' : '0') + binary; // Bottom to top
        }
        return binary;
    }
}
