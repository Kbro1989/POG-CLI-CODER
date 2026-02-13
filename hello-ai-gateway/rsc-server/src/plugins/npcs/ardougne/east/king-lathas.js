

const { Npcs } = require('../../../../constants/ids');

const KING_LATHAS_ID = Npcs.KING_LATHAS || 512; // 512

async function onTalkToNPC(player, npc) {
    if (npc.id !== KING_LATHAS_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('Greetings traveller', 'I am King Lathas of Ardougne');

    const option = await player.ask([
        'I am in search of a quest',
        'Do you have any news?'
    ], true);

    if (option === 0) {
        await player.say('I am in search of a quest');
        // Placeholder for potential future quests (Plague City / Biohazard)
        await npc.say('I may have work for you in the future', 'But for now my guards handle most matters');
    } else {
        await player.say('Do you have any news?');
        await npc.say('The west is wild and dangerous', 'We do our best to keep the peace here in the East');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
