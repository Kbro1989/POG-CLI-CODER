const { Items, Npcs } = require('../../../../constants/ids');

const DARK_MAGE_ID = Npcs.DARK_MAGE || 667; // 667
const BROKEN_STAFF_ID = Items.BROKEN_STAFF || 1398; // 1398
const FIXED_STAFF_ID = Items.STAFF_OF_IBAN || 1031; // 1031

async function onTalkToNPC(player, npc) {
    if (npc.id !== DARK_MAGE_ID) {
        return false;
    }

    player.engage(npc);

    // Dark Mage - West Ardougne (ID 667)
    player.message('You speak to the Dark Mage.');

    // Authentic Dialogue
    await player.say('hello there');
    await npc.say('why do do you interupt me traveller?');

    await player.say('i just wondered what you\'re doing?');
    await npc.say('i experiment with dark magic', 'it\'s a dangerous craft');

    if (player.inventory.contains(BROKEN_STAFF_ID)) {
        await player.say('could you fix this staff?');
        player.message('you show the mage your staff of iban');
        await npc.say('almighty zamorak! the staff of iban!');
        await player.say('can you fix it?');
        await npc.say('this truly is dangerous magic traveller', 'i can fix it, but it will cost you', 'the process could kill me');
        await player.say('how much?');
        await npc.say('200,000 gold pieces, not a penny less');

        const option = await player.ask([
            'no chance, that\'s ridiculous',
            'ok then'
        ], true);

        if (option === 1) {
            if (player.inventory.remove(10, 200_000)) { // 10 = Coins
                if (player.inventory.remove(BROKEN_STAFF_ID, 1)) {
                    player.inventory.add(FIXED_STAFF_ID, 1); // Fixed staff
                    player.message('you give the mage 200,000 coins');
                    player.message('and the staff of iban');
                    player.message('the mage fixes the staff and returns it to you');
                    await player.say('thanks mage');
                    await npc.say('you be carefull with that thing');
                }
            } else {
                await player.say('you don\'t have enough money', 'oops, i\'m a bit short');
            }
        } else {
            await npc.say('fine by me');
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
