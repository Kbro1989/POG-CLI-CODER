const { Items, Npcs } = require('../../../constants/ids');

const MAGIC_INSTRUCTOR_ID = Npcs.MAGIC_INSTRUCTOR || 494; // 494

const AIR_RUNE_ID = Items.AIR_RUNE || 33; // 33
const MIND_RUNE_ID = Items.MIND_RUNE || 35; // 35
const WATER_RUNE_ID = Items.WATER_RUNE || 32; // 32
const EARTH_RUNE_ID = Items.EARTH_RUNE || 34; // 34
const BODY_RUNE_ID = Items.BODY_RUNE || 36; // 36
const CHICKEN_ID = Npcs.CHICKEN || 3; // 3

async function onTalkToNPC(player, npc) {
    // Only handle magic instructor NPC
    if (npc.id !== MAGIC_INSTRUCTOR_ID) {
        return false;
    }

    player.engage(npc);
    try {
        const tutorialStage = player.cache.tutorial || 0;

        if (tutorialStage === 70) {
            await npc.say(
                "there's good magic potential in this one",
                "Yes definitely something I can work with"
            );

            const menu = await player.ask([
                "Hmm are you talking about me?",
                "teach me some magic"
            ]);

            if (menu === 0) {
                await npc.say("Yes that is the one of which I speak");
            } else if (menu === 1) {
                await npc.say("Teacher, yes I am one of them");
            }

            await npc.say(
                "Ok move your mouse over the book icon on the menu bar",
                "this is your magic menu",
                "You will see at level 1 magic you can only cast wind strike",
                "move your mouse over the wind strike text",
                "If you look at the bottom of the magic window",
                "You will see more information about the spell",
                "runes required for the spell have two numbers over them",
                "The first number is how many runes you have",
                "The second is how many runes the spell requires",
                "Speak to me again when you have checked this"
            );
            player.cache.tutorial = 75;

        } else if (tutorialStage === 75) {
            await player.say("I don't have the runes to cast wind strike");
            await npc.say(
                "How do you expect to do magic without runes?",
                "Ok I shall have to provide you with runes"
            );
            player.message("The instructor gives you some runes");
            player.inventory.add(AIR_RUNE_ID, 12);
            player.inventory.add(MIND_RUNE_ID, 8);
            player.inventory.add(WATER_RUNE_ID, 3);
            player.inventory.add(EARTH_RUNE_ID, 2);
            player.inventory.add(BODY_RUNE_ID, 1);

            await npc.say(
                "Ok look at your spell list now",
                "You will see you have the runes for the spell",
                "And it shows up yellow in your list"
            );
            player.cache.tutorial = 76;

        } else if (tutorialStage === 76 || tutorialStage === 77) {
            // Check for chicken
            // const chicken = player.world.npcs.find(n => n.id === CHICKEN_ID && n.withinRange(player, 10));
            // Simplified: assume chicken exists or spawn one

            if (tutorialStage === 76) {
                await npc.say(
                    "Aha a chicken",
                    "An Ideal wind strike target",
                    "ok click on the wind strike spell in your spell list",
                    "then click on the chicken to chose it as a target"
                );
                player.cache.tutorial = 77;
            } else {
                await npc.say(
                    "To shoot a wind strike at a chicken",
                    "select the book icon in the menu bar",
                    "then click on the yellow wind strike text",
                    "then left click on the chicken to cast the spell"
                );
                player.cache.tutorial = 78;
            }

        } else {
            await npc.say(
                "Well done",
                "As you get a higher magic level",
                "You will be able to cast all sorts of interesting spells",
                "Now go through the next door"
            );
            if (tutorialStage < 80) {
                player.cache.tutorial = 80;
            }
        }
    } finally {
        player.disengage();
    }
    return true;
}

module.exports = { onTalkToNPC };