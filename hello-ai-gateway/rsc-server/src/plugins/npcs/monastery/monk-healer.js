

const { Npcs } = require('../../../constants/ids');

const MONK_IDS = new Set([
    Npcs.MONK_HEALER || 93,
    Npcs.ABBOT_LANGLEY || 174
]);

async function onTalkToNPC(player, npc) {
    if (!MONK_IDS.has(npc.id)) {
        return false;
    }

    player.engage(npc);

    await npc.say('Greetings traveller');

    const option = await player.ask([
        'Can you heal me? I\'m injured',
        'Isn\'t this place built a bit out the way?'
    ], true);

    if (option === 0) {
        await npc.say('Ok');
        player.message('The monk places his hands on your head');

        await player.world.sleepTicks(2);
        player.message('You feel a little better');

        const current = player.skills.hits.current;
        const max = player.skills.hits.level;
        if (current < max) {
            player.skills.hits.current = Math.min(max, current + 10); // Standard heal amount?
            player.skills.hits.current = Math.min(max, player.skills.hits.current); // Clamp again just in case
            player.sendStat(3); // 3 = Hits stat index
        }
    } else {
        await npc.say('We like it that way', 'We get disturbed less', 'We still get rather a large amount of travellers', 'looking for sanctuary and healing here as it is');
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
