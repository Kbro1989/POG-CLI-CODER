const { Npcs } = require('../../../constants/ids');

const ZAMBO_ID = Npcs.ZAMBO || 165; // 165

async function onTalkToNPC(player, npc) {
    if (npc.id !== ZAMBO_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Hey are you wanting to try some of my fine wines and spirits?',
        'All brewed locally on Karamja island'
    );

    const choice = await player.ask(['Yes please', 'No thankyou'], true);

    if (choice === 0) {
        player.disengage();
        player.openShop('karamja-wines-spirits-and-beers');
        return true;
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
