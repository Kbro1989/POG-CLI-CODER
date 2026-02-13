const { Npcs } = require('../../../constants/ids');

const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_IDS = new Set([Npcs.SHOPKEEPER_EDGEVILLE_GENERAL || 185, Npcs.SHOPKEEPER_ASSISTANT_EDGEVILLE_GENERAL || 186]); // 185, 186

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    return await canIHelpYou(player, npc, 'edgeville-general');
}

module.exports = { onTalkToNPC };
