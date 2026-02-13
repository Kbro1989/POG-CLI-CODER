const { Npcs } = require('../../../constants/ids');

const QUEST_NAME = "Legends Quest";
const LEGENDS_GUARD_ID = Npcs.LEGENDS_GUILD_GUARD || 736; // 736

async function onTalkToNPC(player, npc) {
    if (npc.id !== LEGENDS_GUARD_ID) {
        return false;
    }

    player.engage(npc);

    const stage = player.questStages[QUEST_NAME];

    if (stage >= 0) {
        player.message("The guard nods at you.");
        await npc.say("Welcome back, Legend.");
    } else {
        await npc.say("Halt! Only the greatest heroes may enter the Legends' Guild.");
        await player.say("How do I get in?");
        await npc.say("You must have completed 107 Quest Points to prove your worth.");

        if (player.questPoints >= 107) {
            await player.say("I have " + player.questPoints + " Quest Points.");
            await npc.say("Impressive. You may enter and speak to the Grand Vizier.");
            player.updateQuestStage(QUEST_NAME, 0); // Start the quest
        } else {
            await player.say("I only have " + player.questPoints + " Quest Points.");
            await npc.say("Come back when you are more experienced.");
        }
    }

    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
