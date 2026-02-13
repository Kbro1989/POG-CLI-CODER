

const { Npcs } = require('../../../../constants/ids');

module.exports = (router) => {
    // Paladins (323, 632, 633), Heroes (324), Knights (various)
    const PALADINS = [
        Npcs.PALADIN || 323,
        Npcs.PALADIN_632 || 632,
        Npcs.PALADIN_633 || 633
    ];
    const HEROES = [Npcs.HERO || 324];

    router.on('talk', PALADINS, (player, npc) => {
        player.message('You speak to the Paladin.');
        npc.message('I am on duty, citizen', 'The King expects vigilance');
    });

    router.on('talk', HEROES, (player, npc) => {
        player.message('You speak to the Hero.');
        npc.message('My days of adventuring are not over yet', 'But for now I rest');
        player.message('Do you have any tips for a new adventurer?');
        npc.message('Keep your sword sharp and your wits sharper');
    });
};
