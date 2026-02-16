import { GutenbergLimb } from '../src/limbs/gutenberg/GutenbergLimb.js';
import { RelicLimb } from '../src/limbs/experimental/RelicLimb.js';
import { QuantumLimb } from '../src/limbs/experimental/QuantumLimb.js';
import { OmegaLimb } from '../src/limbs/experimental/OmegaLimb.js';




async function verify() {
    const config: any = {
        rootStack: [], projectRoot: process.cwd(),
        pogDir: process.cwd(), // Simplified for test
        enabledServices: ['gemini', 'relic', 'quantum', 'omega'],
        cloudflareAccountId: '',
        cloudflareApiToken: ''
    };

    console.log('--- Verifying Gutenberg Style Analysis ---');
    const gutenberg = new GutenbergLimb(config as any);
    const gutenbergTools = (gutenberg as any).spine.getCapabilities();
    console.log('Gutenberg Tools:', gutenbergTools);
    if (gutenbergTools.includes('gutenberg_analyze_style')) {
        console.log('✅ gutenberg_analyze_style registered.');
    } else {
        console.error('❌ gutenberg_analyze_style NOT found.');
    }

    console.log('\n--- Verifying Relic Limb Hardening ---');
    const relic = new RelicLimb(config as any);
    const relicTools = (relic as any).spine.getCapabilities();
    console.log('Relic Tools:', relicTools);
    if (relicTools.includes('relic_excavate_cache')) {
        console.log('✅ relic_excavate_cache registered.');
    }

    console.log('\n--- Verifying Quantum & Omega Limbs ---');
    const quantum = new QuantumLimb(config as any);
    const omega = new OmegaLimb(config as any);
    console.log('Quantum Tools:', (quantum as any).spine.getCapabilities());
    console.log('Omega Tools:', (omega as any).spine.getCapabilities());

    if ((quantum as any).spine.getCapabilities().includes('quantum_superposition')) {
        console.log('✅ quantum_superposition registered.');
    }
    if ((omega as any).spine.getCapabilities().includes('omega_teleology_check')) {
        console.log('✅ omega_teleology_check registered.');
    }

    console.log('\n--- Wiring Verification Complete ---');
}

verify().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});

