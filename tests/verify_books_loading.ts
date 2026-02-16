
import WebSocket from 'ws';

const TEST_PORT = 8765; // Default port from config.ts
const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

ws.on('open', () => {
    console.log('Connected! Sending requestBooks command...');
    ws.send(JSON.stringify({
        type: 'control',
        command: 'requestBooks',
        data: {}
    }));
});

ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'books') {
            console.log('✅ Received Books List');
            console.log(`📚 Books count: ${msg.data ? msg.data.length : 0}`);
            if (msg.data && msg.data.length > 0) {
                console.log('First book:', msg.data[0].title);
            } else {
                console.log('⚠️ No books found (Gutenberg might be empty or unindexed)');
            }
            ws.close();
            process.exit(0);
        } else if (msg.type === 'state') {
            console.log('Received State (ignoring)...');
        } else {
            console.log('Received other message:', msg.type);
        }
    } catch (e) {
        console.error('Failed to parse message:', e);
    }
});

ws.on('error', (err) => {
    console.error('WS Error:', err);
    process.exit(1);
});

// Timeout after 10s
setTimeout(() => {
    console.log('❌ Timeout waiting for books');
    ws.close();
    process.exit(1);
}, 10000);

