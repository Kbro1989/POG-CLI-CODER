const { Npcs } = require('../../../constants/ids');

const { canIHelpYou } = require('../general-shopkeeper');

const DWARVEN_SHOPKEEPER_ID = Npcs.SHOPKEEPER_DWARVEN_MINE_GENERAL || 143; // 143

async function onTalkToNPC(player, npc) {
    if (npc.id !== DWARVEN_SHOPKEEPER_ID) {
        return false;
    }

    return await canIHelpYou(player, npc, 'dwarven-mine-general');
}

module.exports = { onTalkToNPC };
