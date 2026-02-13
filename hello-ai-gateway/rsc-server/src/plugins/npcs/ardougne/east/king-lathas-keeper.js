// King Lathas Keeper NPC (Training Camp Shop)
const { Npcs } = require('../../../../constants/ids');

const SHOP_KEEPER_ID = Npcs.SHOPKEEPER_ARDOUGNE_TRAINING_CAMP_GENERAL || 528; // 528 (Generic, but specific location logic might be needed if multiple 528s exist)

const trainingCampShop = {
    name: 'Training Camp Shop',
    general: false,
    buys: 150,
    sells: 50,
    delta: 2,
    stock: {
        'bronze_arrows': 200,
        'crossbow_bolts': 150,
        'shortbow': 4,
        'longbow': 2,
        'crossbow': 2,
        'bronze_arrow_heads': 200,
        'iron_arrow_heads': 180,
        'steel_arrow_heads': 160,
        'mithril_arrow_heads': 140,
        'iron_axe': 5,
        'steel_axe': 3,
        'iron_battle_axe': 5,
        'steel_battle_axe': 2,
        'mithril_battle_axe': 1,
        'bronze_2_handed_sword': 4,
        'iron_2_handed_sword': 3,
        'steel_2_handed_sword': 2,
        'black_2_handed_sword': 1,
        'mithril_2_handed_sword': 1,
        'adamantite_2_handed_sword': 1
    }
};

async function onTalkToNPC(player, npc) {
    if (npc.id !== SHOP_KEEPER_ID) {
        return false;
    }

    player.engage(npc);

    await player.say("hello");
    await npc.say("so are you looking to buy some weapons?", "king lathas keeps us very well stocked");

    const option = await player.ask([
        "what do you have?",
        "no thanks"
    ], true);

    if (option === 0) {
        await npc.say("take a look");
        player.openShop(trainingCampShop);
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
