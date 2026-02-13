

const { Items, Npcs } = require('../../../../constants/ids');

module.exports = (router) => {
    // Bartender at Flying Horse Inn (Ardougne)
    // Using common Bartender IDs: 12, 150, 306, 340, 520, 529.
    // Logic will apply if in Ardougne coordinates.
    const COMMON_BARTENDERS = [
        Npcs.BARTENDER || 12,
        Npcs.BARTENDER_RUSTY_ANCHOR || 150,
        Npcs.BARTENDER_FORESTERS_ARMS || 306,
        Npcs.BARTENDER_FLYING_HORSE_INN || 340,
        Npcs.BARTENDER_DANCING_DONKEY || 520,
        Npcs.BARTENDER_DRAGON_INN || 529
    ];

    router.on('talk', COMMON_BARTENDERS, (player, npc) => {
        // Simple location check for Ardougne (East) radius
        // Center roughly: 585, 595 (Ardougne Market/Inn area)
        if (player.x >= 540 && player.x <= 600 && player.y >= 560 && player.y <= 620) {
            npc.message('Would you like to buy a drink?');
            player.message('What do you serve?');
            npc.message('Beer');

            player.options('I\'ll have a beer then', 'I\'ll not have anything then', (option) => {
                if (option === 0) {
                    npc.message('Ok, that\'ll be two coins');
                    if (player.inventory.remove(10, 2)) { // 10 = Coins
                        player.inventory.add(Items.BEER || 193, 1); // 193 = Beer (verify ID if possible, standard beer)
                        player.message('You buy a pint of beer');
                    } else {
                        player.message('Oh dear. I don\'t seem to have enough money');
                    }
                } else {
                    player.message('I\'ll not have anything then');
                }
            });
        }
    });
};
