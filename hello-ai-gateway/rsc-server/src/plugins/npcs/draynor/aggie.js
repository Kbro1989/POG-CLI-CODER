// https://classic.runescape.wiki/w/Transcript:Aggie
// this npc has a TON of spelling mistakes, so triple check the transcript
const { Items, Npcs } = require('../../../constants/ids');

const { skinPaste } = require('../../quests/free/prince-ali-rescue/aggie');

const AGGIE_ID = Npcs.AGGIE || 125; // 125
const BLUE_DYE_ID = Items.BLUE_DYE || 272; // 272
const FLOUR_ID = Items.POT_OF_FLOUR || 136; // 136
const RED_DYE_ID = Items.RED_DYE || 238; // 238
const YELLOW_DYE_ID = Items.YELLOW_DYE || 239; // 239
const REDBERRIES_ID = Items.REDBERRIES || 236; // 236
const ONION_ID = Items.ONION || 241; // 241
const WOAD_LEAF_ID = Items.WOAD_LEAF || 281; // 281
const COINS_ID = Items.COINS || 10; // 10

const DYE_COLOURS = {
    [RED_DYE_ID]: 'red',
    [YELLOW_DYE_ID]: 'yellow',
    [BLUE_DYE_ID]: 'blue'
};

const INGREDIENT_NAMES = {
    [REDBERRIES_ID]: 'berries',
    [ONION_ID]: 'onions',
    [WOAD_LEAF_ID]: 'woad leaves'
};

const DYE_INGREDIENTS = {
    [RED_DYE_ID]: { id: REDBERRIES_ID, amount: 3 }, // red (3 redberries)
    [YELLOW_DYE_ID]: { id: ONION_ID, amount: 2 }, // yellow (2 onions)
    [BLUE_DYE_ID]: { id: WOAD_LEAF_ID, amount: 2 } // blue (2 woad leaves)
};

async function askDye(player, npc, dyeID) {
    const colour = DYE_COLOURS[dyeID];

    const choice = await player.ask(
        [
            `Okay, make me some some ${colour} dye please`,
            "I don't think I have all the ingredients yet",
            'I can do without dye at that price'
        ],
        true
    );

    const ingredient = DYE_INGREDIENTS[dyeID];
    const ingredientName = INGREDIENT_NAMES[ingredient.id];

    switch (choice) {
        case 0: // okay
            if (!player.inventory.has(ingredient)) {
                player.message(
                    `You don't have enough ${ingredientName} to make the ` +
                    `${colour} dye!`
                );
            } else if (!player.inventory.has(COINS_ID, 5)) {
                player.message(
                    "You don't have enough coins to pay for the dye!"
                );
            } else {
                player.inventory.remove(ingredient);
                player.inventory.remove(COINS_ID, 5);

                player.message(
                    `You hand the ${ingredientName} and payment to Aggie`,
                    `she takes a ${colour} bottle from nowhere and hands it ` +
                    'to you'
                );

                player.inventory.add(dyeID);
            }
            break;
        case 1: // dont have ingredients
            if (dyeID === BLUE_DYE_ID) {
                await player.say(
                    'Where on earth am I meant to find woad leaves?'
                );

                await npc.say(
                    "I'm not entirely sure",
                    'I used to go and nab the stuff from the public gardens ' +
                    'in Falador',
                    "It hasn't been growing there recently though"
                );
            } else {
                await npc.say(
                    'You know what you need to get now, come back when you ' +
                    'have them',
                    'goodbye for now'
                );
            }
            break;
        case 2: // not at that price
            await npc.say(
                'Thats your choice, but I would think you have killed for less',
                'I can see it in your eyes'
            );
            break;
    }
}

async function makingDyes(player, npc, asked) {
    const choices = [
        'What do you need to make some red dye please',
        'What do you need to make some yellow dye please',
        'What do you need to make some blue dye please'
    ];

    if (!asked) {
        choices.push('No thanks I am happy the colour I am');
    }

    const choice = await player.ask(choices, true);

    switch (choice) {
        case 0: // red
            await npc.say('3 lots of Red berries, and 5 coins, to you');
            await askDye(player, npc, RED_DYE_ID);
            break;
        case 1: // yellow
            await npc.say(
                'Yellow is a strange colour to get, comes from onion skins',
                'I need 2 onions, and 5 coins to make yellow'
            );
            await askDye(player, npc, YELLOW_DYE_ID);
            break;
        case 2: // blue
            await npc.say('2 woad leaves, and 5 coins, to you');
            await askDye(player, npc, BLUE_DYE_ID);
            break;
        case 3: // no thanks
            await npc.say(
                'You are easily pleased with yourself then',
                'when you need dyes, come to me'
            );
            break;
    }
}

async function onTalkToNPC(player, npc) {
    if (npc.id !== AGGIE_ID) {
        return false;
    }

    player.engage(npc);

    await npc.say('What can I help you with?');

    const choices = [
        'What could you make for me',
        'Cool, do you turn people into frogs?',
        "You mad old witch, you can't help me",
        'Can you make dyes for me please'
    ];

    const princeAliRescueStage = player.questStages.princeAliRescue;
    let offerPaste = false;

    if (princeAliRescueStage === 2 || princeAliRescueStage === 3) {
        choices.unshift('Could you think of a way to make pink skin paste');
        offerPaste = true;
    }

    let choice = await player.ask(choices, true);

    if (offerPaste) {
        if (choice === 0) {
            await skinPaste(player, npc);
            player.disengage();
            return true;
        } else {
            choice -= 1;
        }
    }

    switch (choice) {
        case 0: // what could you make
            await npc.say(
                'I mostly just make what I find pretty',
                'I sometimes make dye for the womens clothes, brighten the ' +
                'place up',
                'I can make red,yellow and blue dyes would u like some'
            );

            await makingDyes(player, npc, false);
            break;
        case 1: // frogs
            await npc.say(
                'Oh, not for years, but if you met a talking chicken,',
                'You have probably met the professor in the Manor north of ' +
                'here',
                'A few years ago it was flying fish, that machine is a menace'
            );
            break;
        case 2: // mad witch
            await npc.say("Oh, you like to call a witch names, don't you?");

            if (player.inventory.has(COINS_ID, 20)) {
                player.inventory.remove(COINS_ID, 20);
                player.message(
                    'Aggie waves her hand out, and you seem to be 20 coins ' +
                    'poorer'
                );

                await npc.say(
                    'Thats a fine for insulting a witch, you should learn ' +
                    'some respect'
                );
            } else if (player.inventory.has(FLOUR_ID)) {
                player.inventory.remove(FLOUR_ID);

                await npc.say(
                    'Thankyou for your kind present of flour',
                    'I am sure you never meant to insult me'
                );
            } else {
                await npc.say(
                    'You should be careful about insulting a Witch',
                    'You never know what shape you could wake up in'
                );
            }

            break;
        case 3: // dyes
            await npc.say(
                'What sort of dye would you like? Red, yellow or Blue?'
            );

            await makingDyes(player, npc, true);
            break;
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
