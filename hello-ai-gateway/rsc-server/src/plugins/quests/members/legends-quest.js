// Inline random utility
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// IDs
const RADIMUS = 735;
const GUILD_GUARD = 736;
const MITHRIL_GATE = 1079;
const RADIMUS_SCROLLS = 1163;
const RADIMUS_SCROLLS_COMPLETE = 1233; // Verified: 1233 is Scroll, 1175 is Talisman
const PAPYRUS = 982;
const CHARCOAL = 983; // Verification needed
const MACHETE = 984; // Verification needed
const TOTEM_POLE = 1111; // Verified: 1111 is Totem, 1176 is Palm Tree

// Quest Config
const QUEST_ID = 50; // Legends Quest
const MIN_QP = 107;

// Mapping Zones (Karamja Jungle)
const ZONES = {
    WEST: { minX: 432, maxX: 477, minY: 872, maxY: 909 },
    MIDDLE: { minX: 384, maxX: 431, minY: 874, maxY: 909 },
    EAST: { minX: 338, maxX: 383, minY: 875, maxY: 909 }
};

const inZone = (player, zone) => {
    return player.x >= zone.minX && player.x <= zone.maxX &&
        player.y >= zone.minY && player.y <= zone.maxY;
};

module.exports = (api) => {

    // --- SIR RADIMUS ERKLE (Start) ---
    api.onNpcTalk(RADIMUS, async (player, npc) => {
        const stage = player.getQuestStage(QUEST_ID);

        if (stage === 0) {
            await player.message("Good day to you.");
            await npc.message("No doubt you are keen to become a member of the Legends Guild?");

            const opt = await player.option(
                "Yes actually, what's involved?",
                "Maybe some other time",
                "Who are you?"
            );

            if (opt === 0) { // Yes
                await npc.message("Well, you need to complete a quest for us.");
                await npc.message("You need to map an area called the Kharazi Jungle.");
                await npc.message("It is the unexplored southern part of Karamja.");
                await npc.message("Are you interested?");

                const start = await player.option("Yes, sounds great!", "Not at the moment");
                if (start === 0) {
                    await npc.message("Excellent!");
                    await npc.message("Here is a starting map.");
                    player.inventory.add(RADIMUS_SCROLLS);
                    player.startQuest(QUEST_ID);
                    player.setQuestStage(QUEST_ID, 1);
                    await npc.message("You'll need papyrus and charcoal to complete it.");
                    await npc.message("Good luck!");
                }
            }
        } else if (stage === 1) {
            if (player.inventory.contains(RADIMUS_SCROLLS_COMPLETE)) {
                await npc.message("Ah! You have the complete map!");
                // Check if they also have the "Token" (Totem) - simplified for port
                // In full quest, they need the Totem + Map + Viyeldi check.
                // We'll advance them for now if they have the map to simulate functionality.
                await npc.message("This is excellent work.");
                await npc.message("Welcome to the Guild!");
                player.setQuestStage(QUEST_ID, 11); // Complete
                player.sendQuestComplete(QUEST_ID);
            } else {
                await npc.message("Have you mapped the jungle yet?");
                await npc.message("Don't forget the charcoal and papyrus.");
            }
        } else if (stage === 11) {
            await npc.message("Welcome back, Legend.");
        }
    });

    // --- GUILD GUARD (Entry) ---
    api.onNpcTalk(GUILD_GUARD, async (player, npc) => {
        const stage = player.getQuestStage(QUEST_ID);

        if (stage === 11) {
            await npc.message("Attention! Legends Member approaching!");
            // Open gate handled by object op
            return;
        }

        await npc.message("How can I help you?");
        const opt = await player.option("Can I go on the quest?", "What is this place?");

        if (opt === 0) {
            // Check Req
            if (player.questPoints >= MIN_QP) {
                await npc.message("You seem eligible. Speak to Grand Vizier Erkle inside.");
                // Should open the outer gate or user acts on it.
            } else {
                await npc.message("I'm sorry, you need 107 Quest Points to enter.");
            }
        }
    });

    // --- GATE LOGIC ---
    api.onObjectInteraction(MITHRIL_GATE, async (player, obj) => {
        const stage = player.getQuestStage(QUEST_ID);
        // Radimus is in the "house" outside the main guild, so gate access 
        // implies access to the Radimus building (left) or Main Hall (center)?
        // OpenRSC says guard unlocks gate to see Radimus if eligible.

        if (stage === 11) {
            await player.message("You open the gates.");
            if (player.y <= 550) player.teleport(513, 552); // Enter
            else player.teleport(513, 549); // Leave
            return;
        }

        // Simulating Guard interaction for entry
        if (player.questPoints >= MIN_QP || stage > 0) {
            await player.message("The guard opens the gate for you.");
            if (player.y <= 550) player.teleport(513, 552);
            else player.teleport(513, 549);
        } else {
            await player.message("The guard stops you.");
            await player.message("You need 107 Quest Points to enter.");
        }
    });

    // --- MAPPING MECHANIC (Scrolls) ---
    api.onItemAction(RADIMUS_SCROLLS, async (player, item) => {
        const hasPapyrus = player.inventory.contains(PAPYRUS);
        const hasCharcoal = player.inventory.contains(CHARCOAL);

        if (!inZone(player, ZONES.WEST) && !inZone(player, ZONES.MIDDLE) && !inZone(player, ZONES.EAST)) {
            await player.message("You are not in the Kharazi Jungle.");
            return;
        }

        if (!hasPapyrus || !hasCharcoal) {
            await player.message("You need Papyrus and Charcoal to map this area.");
            return;
        }

        if (player.skills.crafting < 50) {
            await player.message("You need 50 Crafting to map this area.");
            return;
        }

        await player.message("You start mapping...");
        await player.wait(2);

        if (random(0, 100) < 30) {
            await player.message("You successfully map this section.");
            player.inventory.remove(PAPYRUS); // Consume papyrus

            let section = "";
            if (inZone(player, ZONES.WEST)) section = "JUNGLE_WEST";
            else if (inZone(player, ZONES.MIDDLE)) section = "JUNGLE_MIDDLE";
            else if (inZone(player, ZONES.EAST)) section = "JUNGLE_EAST";

            player.setCache(section, true);

            if (player.getCache('JUNGLE_WEST') && player.getCache('JUNGLE_MIDDLE') && player.getCache('JUNGLE_EAST')) {
                await player.message("You have completed the map!");
                player.inventory.remove(RADIMUS_SCROLLS);
                player.inventory.add(RADIMUS_SCROLLS_COMPLETE);
            } else {
                await player.message("You still have other sections to map.");
            }

        } else {
            await player.message("You make a mess of it and ruin the papyrus.");
            player.inventory.remove(PAPYRUS);
        }
    });
};
