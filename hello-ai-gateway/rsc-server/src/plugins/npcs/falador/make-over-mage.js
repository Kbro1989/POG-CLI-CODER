// https://classic.runescape.wiki/w/Transcript:Make_over_mage
const { Items, Npcs } = require('../../../constants/ids');

const MAKE_OVER_MAGE_ID = Npcs.MAKE_OVER_MAGE || 339; // 339
const COINS_ID = Items.COINS || 10; // 10

async function onTalkToNPC(player, npc) {
    if (npc.id !== MAKE_OVER_MAGE_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say(
        'Are you happy with your looks?',
        'If not I can change them for the cheap cheap price',
        'Of 3000 coins'
    );

    const choice = await player.ask(
        ["I'm happy with how I look thank you", 'Yes change my looks please'],
        true
    );

    if (choice === 1) {
        if (player.inventory.has(COINS_ID, 3000)) {
            player.inventory.remove(COINS_ID, 3000);
            player.message('You pay the mage 3000 coins');
            player.disengage();
            player.lock();
            player.sendAppearance();
            player.cache.sendAppearance = true;
            return true;
        } else {
            await player.say("I'll just go get the cash");
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
