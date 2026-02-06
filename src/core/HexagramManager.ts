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
        return this.setLine(index, card);
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

    async formatForPrompt(): Promise<string> {
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
            case YaoState.OldYang: return 'Old Yang (Moving ——O)';
            case YaoState.YoungYin: return 'Young Yin (Stable - -)';
            case YaoState.YoungYang: return 'Young Yang (Stable ——)';
            case YaoState.OldYin: return 'Old Yin (Moving - -X)';
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
