// Mourner IDs (Plague City / Biohazard)
const { Npcs } = require('../../../../constants/ids');

const MOURNER_IDS = new Set([
    Npcs.MOURNER || 444,
    Npcs.MOURNER_445 || 445,
    Npcs.MOURNER_451 || 451,
    Npcs.MOURNER_491 || 491,
    Npcs.HEAD_MOURNER || 446
]);

async function onTalkToNPC(player, npc) {
    if (!MOURNER_IDS.has(npc.id)) {
        return false;
    }
    const id = npc.id;
    const plagueStage = player.quests.plague_city?.stage || 0;

    player.engage(npc);

    // MOURNER_444 (General Ardougne?)
    if (id === (Npcs.MOURNER || 444)) {
        if (plagueStage === 0) {
            await player.say("hello there");
            await npc.say("Do you a have problem traveller?");
            await player.say("no i just wondered why your wearing that outfit");
            player.message("is it fancy dress?"); // Should be player.chat usually, assuming continuation.
            await npc.say("no it's for protection");
            await player.say("protection from what");
            await npc.say("the plague of course");
            player.disengage();
            return true;
        }
    }

    // MOURNER_451 (Border Guard)
    if (id === (Npcs.MOURNER_451 || 451)) {
        await player.say("hello there");
        await npc.say("can I help you?");
        await player.say("what are you doing?");
        await npc.say("I'm guarding the border to west ardougne");
        await player.world.sleepTicks(1);
        await npc.say("no one except us mourners can pass through");
        player.disengage();
        return true;
    }

    await npc.say("Move along, citizen.");
    player.disengage();
    return true;
}

module.exports = { onTalkToNPC };
