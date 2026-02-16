
import WebSocket from 'ws';

const TEST_PORT = 8765; // Default port from config.ts
const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

console.log('Connecting to Dashboard WS...');

ws.on('open', () => {
    console.log('Connected! Waiting for state...');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === 'state') {
        console.log('✅ Received Initial State');
        if (msg.data.neuralHeatmap) {
            console.log('✅ Neural Heatmap present:', Object.keys(msg.data.neuralHeatmap).length, 'entries');
        } else {
            console.error('❌ Neural Heatmap MISSING in state');
        }

        if (msg.data.sovereignVoice) {
            console.log('✅ Sovereign Voice present');
        }
    } else if (msg.type === 'health_signal') {
        console.log('✅ Received Health Signal');
        console.log('   CPU:', msg.data.cpu);
        console.log('   Sovereign:', msg.data.sovereign);

        if (msg.data.sovereign && msg.data.sovereign.active) {
            console.log('✅ Sovereign Link ACTIVE');
            process.exit(0);
        } else {
            console.log('⚠️ Sovereign Link INACTIVE (Expected if D: drive missing, but structure is valid)');
            process.exit(0);
        }
    }
});

setTimeout(() => {
    console.log('Timeout waiting for signals.');
    process.exit(1);
}, 10000);

