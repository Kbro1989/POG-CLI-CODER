import { NoMockValidator } from '../src/core/validation/NoMockValidator.js';
import { ArchitecturalValidator } from '../src/core/validation/ArchitecturalValidator.js';

describe('Sovereign Intelligence Validation Stack', () => {
    const noMock = new NoMockValidator();

    describe('NoMockValidator', () => {
        it('should reject code containing TODO comments', async () => {
            const code = 'function foo() { // TODO: implement this\n return true; }';
            const result = await noMock.validate(code);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.reason).toContain('placeholder comments');
            }
        });

        it('should reject stubbed functions returning null', async () => {
            const code = 'function bar() { return null; }';
            const result = await noMock.validate(code);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.reason).toContain('stubbed function');
            }
        });

        it('should reject "not implemented" error placeholders', async () => {
            const code = 'function baz() { throw new Error("not implemented"); }';
            const result = await noMock.validate(code);
            expect(result.ok).toBe(false);
        });

        it('should accept fully implemented code', async () => {
            const code = 'function valid() { const x = 1; return x + 1; }';
            const result = await noMock.validate(code);
            expect(result.ok).toBe(true);
        });

        it('should reject empty function bodies', async () => {
            const code = 'function ghost() {}';
            const result = await noMock.validate(code);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.reason).toContain('Empty function body');
            }
        });
    });

    describe('ArchitecturalValidator', () => {
        const arch = new ArchitecturalValidator({
            domainModel: {},
            dependencyRules: {},
            primaryGoal: 'Test Goal'
        });

        it('should reject illegal layer dependencies (core to limbs)', async () => {
            const code = 'import { Limb } from "../limbs/Limb.js";';
            const result = await arch.validate(code, { fileName: 'src/core/Engine.ts' });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error.reason).toContain('Illegal dependency');
            }
        });

        it('should accept legal local dependencies', async () => {
            const code = 'import { Utils } from "./Utils.js";';
            const result = await arch.validate(code, { fileName: 'src/core/Engine.ts' });
            expect(result.ok).toBe(true);
        });
    });
});
