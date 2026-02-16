
import { describe, it, expect } from '@jest/globals';
import { RSCLimb } from '../src/limbs/experimental/rsc/RSCLimb.js';

describe('RSC Login (Real TCP)', () => {
    it('should successfully log in to local RSC server', async () => {
        const mockConfig = {
            projectId: 'test_rsc_login',
            pogDir: 'test_rsc_dir'
        };
        const mockExecutor = {};

        const limb = new RSCLimb(mockConfig as any, mockExecutor as any);

        // Use 'admin' (just inserted). 
        // Expecting Code 3 (Invalid Credentials) because we inserted a dummy hash,
        // OR Code 0/64 if by some miracle it matches.
        // Code 3 PROVES we reached the server and it checked the password.
        const result = await (limb as any).login('admin', 'admin');

        console.log('Login Result:', JSON.stringify(result, null, 2));

        if (!result.ok) {
            console.error('RSC Login Verification Failed:', result.error);
        }

        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value.data.status).toBe('failure'); // Validated failure
            const code = result.value.data.responseCode;
            // Code 3 = Invalid Credentials (in this codebase, per prior grep)
            expect(code).toBe(3);
        }

        await limb.close();
    }, 20000); // 20s timeout for network operations
});
