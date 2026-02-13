// https://classic.runescape.wiki/w/Transcript:Thessalia
const { Npcs } = require('../../../constants/ids');

const THESSALIA_ID = Npcs.THESSALIA || 59; // 59

async function onTalkToNPC(player, npc) {
    if (npc.id !== THESSALIA_ID) {
        return false;
    }

    player.engage(npc);

    await player.say('Hello');
    await npc.say('Do you want to buy any fine clothes?');

    const choice = await player.ask(
        ['What have you got?', 'No, thank you'],
        true
    );

    if (choice === 0) {
        player.disengage();
        player.openShop('thessalias-fine-clothes');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
