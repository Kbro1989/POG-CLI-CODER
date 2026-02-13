try {
    console.log('Requiring rsc-socket...');
    const socket = require('./rsc-server/node_modules/@2003scape/rsc-socket');
    console.log('Success!');
} catch (e) {
    console.error('Failed:', e);
}
