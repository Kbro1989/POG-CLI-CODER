// https://classic.runescape.wiki/w/Transcript:Banker
const { Npcs } = require('../../constants/ids');

const BANKER_IDS = new Set([Npcs.BANKER || 95, 224, Npcs.BANKER_268 || 268, 540, 617]);

async function onTalkToNPC(player, npc) {
    const npcId = Number(npc.getID());
    console.log(`[BankerPlugin] Checking NPC ${npcId} (Raw: ${npc.getID()}) against IDs: ${[...BANKER_IDS].join(',')}`);

    if (!BANKER_IDS.has(npcId)) {
        return false;
    }

    console.log(`[BankerPlugin] Engaging NPC ${npcId}`);
    player.engage(npc);
    await npc.say('Good day, how may I help you?');

    const choice = await player.ask(
        ["I'd like to access my bank account please", 'What is this place?'],
        true
    );

    switch (choice) {
        case 0: // access
            await npc.say(`Certainly ${player.isMale() ? 'Sir' : 'Miss'}`);
            player.disengage();
            player.bank.open();
            return true;
        // what is this?
        case 1: {
            await npc.say(
                'This is a branch of the bank of Runescape',
                'We have branches in many towns'
            );

            const choice = await player.ask(
                [
                    'And what do you do?',
                    "Didn't you used to be called the bank of Varrock"
                ],
                true
            );

            switch (choice) {
                case 0: // what do you do
                    await npc.say(
                        'We will look after your items and money for you',
                        'So leave your valuables with us if you want to keep ' +
                        'them safe'
                    );
                    break;
                case 1: // bank of varrock
                    await npc.say(
                        'Yes we did, but people kept on coming into our ' +
                        'branches outside of varrock',
                        'And telling us our signs were wrong',
                        "As if we didn't know what town we were in or " +
                        'something!'
                    );
                    break;
            }
            break;
        }
    }

    player.disengage();

    return true;
}

module.exports = { onTalkToNPC };
