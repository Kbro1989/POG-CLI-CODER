// https://classic.runescape.wiki/w/Shopkeeper_(Varrock)
const { Npcs } = require('../../../constants/ids');

const { canIHelpYou } = require('../general-shopkeeper');

const SHOPKEEPER_IDS = new Set([Npcs.SHOPKEEPER_VARROCK_GENERAL || 51, Npcs.SHOPKEEPER_ASSISTANT_VARROCK_GENERAL || 82]); // 51, 82

async function onTalkToNPC(player, npc) {
    if (!SHOPKEEPER_IDS.has(npc.id)) {
        return false;
    }

    return await canIHelpYou(player, npc, 'varrock-general');
}

module.exports = { onTalkToNPC };
