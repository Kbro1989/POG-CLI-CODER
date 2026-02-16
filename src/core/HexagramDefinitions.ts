/**
 * HexagramDefinitions.ts
 * 
 * Semantic registry for the 64 I Ching Hexagrams.
 * Maps binary states (000000-111111) to Archetypes and Strategy Directives.
 * 
 * Used by HexagramManager to interpret the "Soul State" of the agent.
 */

import { EmotionalState } from './models.js';

export interface HexagramDefinition {
    id: number;
    binary: string;
    name: string;
    description: string;
    strategy: string;
    emotion: EmotionalState;
}

export const HEXAGRAM_REGISTRY: Record<string, HexagramDefinition> = {
    '111111': {
        id: 1,
        binary: '111111',
        name: 'The Creative (Qian)',
        description: 'Pure Yang. Limitless potential and energy.',
        strategy: 'EXPANSION: Focus on generating new features and architectural growth.',
        emotion: EmotionalState.Inspired
    },
    '000000': {
        id: 2,
        binary: '000000',
        name: 'The Receptive (Kun)',
        description: 'Pure Yin. Devotion and support.',
        strategy: 'STABILIZATION: Focus on refactoring, testing, and supporting existing code.',
        emotion: EmotionalState.Quiet
    },
    '100010': {
        id: 3,
        binary: '100010',
        name: 'Difficulty at the Beginning (Zhun)',
        description: 'Growth amidst chaos.',
        strategy: 'CAUTION: Proceed carefully with new implementations; prioritize setting up infrastructure.',
        emotion: EmotionalState.Surprised
    },
    '010001': {
        id: 4,
        binary: '010001',
        name: 'Youthful Folly (Meng)',
        description: 'Inexperience seeking a teacher.',
        strategy: 'LEARNING: Consult documentation or KIs before coding. Avoid assumptions.',
        emotion: EmotionalState.Curious
    },
    '111010': {
        id: 5,
        binary: '111010',
        name: 'Waiting (Xu)',
        description: 'Confidence and patience.',
        strategy: 'PATIENCE: Optimization and careful planning. Do not rush the build.',
        emotion: EmotionalState.Steady
    },
    '010111': {
        id: 6,
        binary: '010111',
        name: 'Conflict (Song)',
        description: 'Divergent views.',
        strategy: 'DEBUGGING: Resolve logic conflicts and type errors immediately.',
        emotion: EmotionalState.Agitated
    },
    '010000': {
        id: 7,
        binary: '010000',
        name: 'The Army (Shi)',
        description: 'Organized discipline.',
        strategy: 'STANDARDISATION: Enforce linting rules and strict architectural patterns.',
        emotion: EmotionalState.Decisive
    },
    '000010': {
        id: 8,
        binary: '000010',
        name: 'Holding Together (Bi)',
        description: 'Union and solidarity.',
        strategy: 'INTEGRATION: Focus on connecting systems (Limbs/Router) together.',
        emotion: EmotionalState.Steady
    },
    '101111': {
        id: 14,
        binary: '101111',
        name: 'Possession in Great Measure (Da You)',
        description: 'Supreme success through clarity.',
        strategy: 'MAXIMIZATION: Enhance existing features to their highest potential.',
        emotion: EmotionalState.Inspired
    },
    '001000': {
        id: 15,
        binary: '001000',
        name: 'Modesty (Qian)',
        description: 'Reducing excess.',
        strategy: 'MINIMALISM: Reduce code complexity and remove unused artifacts.',
        emotion: EmotionalState.Quiet
    },
    '100100': {
        id: 51,
        binary: '100100',
        name: 'The Arousing (Zhen)',
        description: 'Shock and thunder.',
        strategy: 'REFACTOR: Radical changes or major version upgrades are favored.',
        emotion: EmotionalState.Decisive
    },
    '001001': {
        id: 52,
        binary: '001001',
        name: 'Keep Still (Gen)',
        description: 'Mountain. Stopping and resting.',
        strategy: 'FREEZE: Code freeze. Only critical bug fixes allowed.',
        emotion: EmotionalState.Quiet
    },
    '110110': {
        id: 58,
        binary: '110110',
        name: 'The Joyous (Dui)',
        description: 'Lake. Communication and exchange.',
        strategy: 'UI/UX: Focus on user interaction, CLI improvements, and feedback loops.',
        emotion: EmotionalState.Inspired
    },
    '011010': {
        id: 29, // Approximate for demonstration of dynamic lookup
        binary: '011010',
        name: 'The Abysmal (Kan)',
        description: 'Water. Danger and repetition.',
        strategy: 'SECURITY: Review validation logic and error handling loops.',
        emotion: EmotionalState.Agitated
    },
    '101101': {
        id: 30,
        binary: '101101',
        name: 'The Clinging (Li)',
        description: 'Fire. Clarity and vision.',
        strategy: 'OBSERVABILITY: Improve logging, monitoring, and debugging output.',
        emotion: EmotionalState.Decisive
    }
};

export const DEFAULT_HEXAGRAM = HEXAGRAM_REGISTRY['111111']; // Default to Creative if unknown
