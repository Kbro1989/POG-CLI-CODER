const { Npcs } = require('../../../constants/ids');

const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_IDS = new Set([Npcs.SHOPKEEPER_FALADOR_GENERAL || 105, Npcs.SHOPKEEPER_ASSISTANT_FALADOR_GENERAL || 106]); // 105, 106

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    return await canIHelpYou(player, npc, 'falador-general');
}

module.exports = { onTalkToNPC };
