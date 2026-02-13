// https://classic.runescape.wiki/w/Shopkeeper_(Lumbridge)
const { Npcs } = require('../../../constants/ids');

const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_IDS = new Set([Npcs.SHOPKEEPER_LUMBRIDGE_GENERAL || 55, Npcs.SHOPKEEPER_ASSISTANT_LUMBRIDGE_GENERAL || 83]); // 55, 83

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    return await canIHelpYou(player, npc, 'lumbridge-general');
}

module.exports = { onTalkToNPC };
