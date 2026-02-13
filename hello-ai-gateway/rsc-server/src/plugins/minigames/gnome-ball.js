
const { IDS } = require('../../ids');
const { getDistance, random } = require('../../utils');

const GNOME_BALL = 981;
const REFEREE = 601;
const CHEERLEADER = 611;
const GOALIE = 596;
const GNOME_BALLER = [595, 597, 598, 599, 600, 602, 603, 604, 605, 606, 607, 608, 609, 610];
const GATE = 702; // OpenRSC ID

// Zone Defines
const GNOME_GOAL = { x: 729, y: 450 };
const LOW_FIELD = { x: 742, y: 450 };

const ZONES = {
    INNER_2XP: '2xp_inner',
    OUTER_2XP: '2xp_outer',
    INNER_1XP: '1xp_inner',
    OUTER_1XP: '1xp_outer',
    PASS: 'pass',
    NO_PASS: 'no_pass',
    NOT_VISIBLE: 'not_visible',
    OUTSIDE_THROWABLE: 'outside_throwable',
    OUTSIDE_KEEP: 'outside_keep'
};

const resolveZone = (player) => {
    const dxGoal = player.x - GNOME_GOAL.x;
    const dyGoal = player.y - GNOME_GOAL.y;
    // Calculate skewed Y for isometric field logic
    const skewedY = dyGoal + 0.5;
    const dxLow = player.x - LOW_FIELD.x;
    const absSkewedY = Math.abs(skewedY);

    if (Math.abs(dyGoal) <= 2 && dxGoal >= 0 && dxGoal <= 2) return ZONES.INNER_2XP;
    if (absSkewedY < 4 && dxGoal >= 5 && dxGoal <= 8) return ZONES.OUTER_2XP;
    if (absSkewedY < 6 && dxGoal >= 1 && dxGoal <= 4) return ZONES.INNER_1XP;
    if (absSkewedY < 6 && dxGoal >= 9 && dxGoal <= 12) return ZONES.OUTER_1XP;

    // Pass Zone approximate logic
    if ((player.x === LOW_FIELD.x && dyGoal >= -5 && dyGoal <= -1) ||
        (player.x > LOW_FIELD.x && (Math.abs(LOW_FIELD.x + 1 - player.x) + Math.abs(LOW_FIELD.y - player.y)) <= 3)) {
        return ZONES.PASS;
    }

    // No Pass
    if ((absSkewedY < 6 && dxLow >= 1 && dxLow <= 5) || (dxLow === 6 && absSkewedY < 5)) return ZONES.NO_PASS;

    // Not Visible (simplified)
    if (player.x === LOW_FIELD.x && dyGoal >= 0 && dyGoal <= 4) return ZONES.NOT_VISIBLE;

    // Outside Throwable
    if (player.x >= 720 && player.x <= 743 && player.y >= 440 && player.y <= 463) return ZONES.OUTSIDE_THROWABLE;

    return ZONES.OUTSIDE_KEEP;
};

module.exports = (api) => {

    // --- REFEREE ---
    api.onNpcTalk(REFEREE, async (player, npc) => {
        if (!player.inventory.contains(GNOME_BALL)) {
            await player.message("Hi, welcome to Gnome Ball");
            const opt = await player.option("How do I play?", "Ok then I'll have a go");

            if (opt === 1) { // Have a go
                await npc.message("Great stuff");
                await npc.message("Ready... go!");
                player.message("The ref throws the ball into the air");
                await player.wait(2);
                player.message("You jump up and catch it");
                player.inventory.add(GNOME_BALL);
            }
        } else {
            await npc.message("The ball is still in play");
        }
    });

    // --- THROWING / PASSING (Item Action) ---
    // If player tries to Wield (default action) the ball in the field, we intercept
    api.onItemAction(GNOME_BALL, async (player, item) => {
        const zone = resolveZone(player);

        if (zone === ZONES.OUTSIDE_KEEP) {
            // Allow wielding if outside field or just do nothing
            return false; // Allow default
        }

        // Inside Field -> Throw/Pass Logic
        if (zone === ZONES.NO_PASS) {
            player.message("You can't make the pass from here");
            return true; // Block default
        }

        if (zone === ZONES.PASS) {
            // Pass to a team member
            // Should find nearest 'winger' (Gnome Baller)
            // Simplified: Any gnome baller
            const teammate = api.getNearestNpc(GNOME_BALLER, player.x, player.y, 10);
            if (teammate) {
                player.message("You pass the ball to the gnome");
                player.inventory.remove(GNOME_BALL);
                // Shoot projectile (if supported)
                await player.wait(2);
                player.message("The gnome throws you a long ball");
                player.inventory.add(GNOME_BALL);
            } else {
                player.message("No one to pass to.");
            }
            return true;
        }

        if ([ZONES.INNER_1XP, ZONES.OUTER_1XP, ZONES.INNER_2XP, ZONES.OUTER_2XP].includes(zone)) {
            // Shooting at Goal
            player.message("You throw the ball at the goal");
            player.inventory.remove(GNOME_BALL);

            // Calc success
            let success = false;
            const r = random(0, 4);
            // Simple logic based on zone
            if (zone.includes('inner')) {
                if (r < 3) success = true;
            } else {
                if (r < 2) success = true;
            }

            await player.wait(2);
            if (success) {
                player.message("It flies through the net...");
                player.wait(1);
                player.message("GOAL!");
                // Give XP
                player.skills.addExperience('agility', 200);
                player.skills.addExperience('ranged', 50);

                const cheerleader = api.getNearestNpc(CHEERLEADER, player.x, player.y, 15);
                if (cheerleader) {
                    // forceText not standard? Use message logic or chat.
                    // cheerleader.forceText("Yahoo! Go traveller!"); 
                    // Fallback if forceText not avail:
                    api.npcMessage(cheerleader, "Yahoo! Go traveller!");
                }
            } else {
                player.message("You miss the goal.");
            }
            return true;
        }

        if (zone === ZONES.OUTSIDE_THROWABLE) {
            player.message("You miss by a mile!");
            return true;
        }

        return false;
    });

    // --- TACKLING ---
    // If a gnome has the ball (we need to track this state, but for now simple tackle logic)
    // OpenRSC tracks `gnomeball_npc`. Here we assume if you don't have the ball, you can tackle.
    api.onNpcOption(GNOME_BALLER, "Tackle", async (player, npc) => {
        if (!player.inventory.contains(GNOME_BALL)) {
            player.message("You attempt to tackle the gnome");
            await player.wait(1);
            if (random(0, 1) === 0) {
                player.message("You skillfully grab the ball");
                player.inventory.add(GNOME_BALL);
            } else {
                player.message("You are pushed away");
                player.damage(1);
            }
        }
    });
};
