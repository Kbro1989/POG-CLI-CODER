try {
    console.log('Attempting to require server.js...');
    const Server = require('./rsc-server/src/server.js');
    console.log('Success!');
} catch (e) {
    console.error('Failed:', e);
}
