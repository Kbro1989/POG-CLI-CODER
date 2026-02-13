try {
    console.log('Requiring world...');
    const World = require('./rsc-server/src/model/world.js');
    console.log('Success world!');
} catch (e) {
    console.error('Failed world:', e);
}

try {
    console.log('Requiring player...');
    const Player = require('./rsc-server/src/model/player.js');
    console.log('Success player!');
} catch (e) {
    console.error('Failed player:', e);
}
