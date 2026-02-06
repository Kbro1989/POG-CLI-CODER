import { HexagramLimb } from '../src/limbs/core/HexagramLimb';
import { HexagramManager, YaoState } from '../src/core/HexagramManager';
import { VectorDB } from '../src/learning/VectorDB';
import { VibeConfig } from '../src/core/models';
import { Validator } from '../src/core/validation/Validator';

// Mock config for VectorDB init
const mockConfig: VibeConfig = {
    apiKey: 'test',
    pogDir: process.cwd(),
    dbPath: ':memory:', // Use in-memory DB for tests if supported, or a temp path
    logLevel: 'error'
};

describe('Hexagram Integration (Maximization)', () => {
    let limb: HexagramLimb;
    let manager: HexagramManager;
    let vectorDB: VectorDB;

    beforeAll(async () => {
        vectorDB = new VectorDB(mockConfig);
        await vectorDB.initialize();
        manager = new HexagramManager(vectorDB, 'test-hex-max');
        await manager.initialize();
        limb = new HexagramLimb(manager);
    });

    test('Limb should parse NL pin intent', async () => {
        const intent = { prompt: 'Pin "Test Strategy" to Line 1: Use TDD always.', tools: [] };
        const result = await limb.execute(intent);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.output).toContain('pinned to Line 1');
        }
    });

    test('Manager should calculate correct Hexagram ID', async () => {
        // Set up "The Creative" (111111) - All Yang
        for (let i = 1; i <= 6; i++) {
            await manager.pinCard(i, `Line ${i}`, 'Content', YaoState.YoungYang); // 2
        }

        const interpretation = manager.getInterpretation();
        expect(interpretation.id).toBe(1);
        expect(interpretation.name).toContain('The Creative');
        expect(interpretation.strategy).toContain('EXPANSION');
    });

    test('Manager should detect "The Receptive" (000000)', async () => {
        // Set all to Yin (YoungYin = 1)
        for (let i = 1; i <= 6; i++) {
            await manager.pinCard(i, `Line ${i}`, 'Yin Content', YaoState.YoungYin); // 1
        }

        const interpretation = manager.getInterpretation();
        expect(interpretation.id).toBe(2);
        expect(interpretation.name).toContain('The Receptive');
    });

    test('NL Query check', async () => {
        const intent = { prompt: 'Consult hexagram status', tools: [] };
        const result = await limb.execute(intent);

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.output).toContain('=== SOVEREIGN HEXAGRAM CONTEXT ===');
            expect(result.value.output).toContain('The Receptive'); // From previous test state
        }
    });
});
