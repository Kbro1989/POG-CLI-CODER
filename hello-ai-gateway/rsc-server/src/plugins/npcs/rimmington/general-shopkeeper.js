// https://classic.runescape.wiki/w/Shopkeeper_(Rimmington)
const { Npcs } = require('../../../constants/ids');

const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_IDS = new Set([Npcs.SHOPKEEPER_RIMMINGTON_GENERAL || 145, Npcs.SHOPKEEPER_ASSISTANT_RIMMINGTON_GENERAL || 146]); // 145, 146

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    return await canIHelpYou(player, npc, 'rimmington-general');
}

module.exports = { onTalkToNPC };
