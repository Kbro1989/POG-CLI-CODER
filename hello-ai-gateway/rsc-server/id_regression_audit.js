
const fs = require('fs');
const path = require('path');

const repo2003 = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/2003scape-repo/src/plugins';
const repoCF = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/src/plugins';

// Regex to find ID-like constants: const SOMETHING = 123; or SOMETHING: 123,
const idPatterns = [
    /const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(\d+)/g,
    /([A-Z_][A-Z0-9_]*)\s*:\s*(\d+)/g,
    /Items\.([A-Z_][A-Z0-9_]*)\s*(?:\|\|\s*(\d+))?/g,
    /Npcs\.([A-Z_][A-Z0-9_]*)\s*(?:\|\|\s*(\d+))?/g,
    /Objects\.([A-Z_][A-Z0-9_]*)\s*(?:\|\|\s*(\d+))?/g
];

function extractIds(content) {
    const ids = {};
    // Simple pattern: const NAME = NUMBER
    const constMatches = content.matchAll(/const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(\d+)/g);
    for (const m of constMatches) {
        ids[m[1]] = parseInt(m[2]);
    }
    return ids;
}

function compareFile(file) {
    const file2003 = path.join(repo2003, file);
    const fileCF = path.join(repoCF, file);

    try {
        const content2003 = fs.readFileSync(file2003, 'utf8');
        const contentCF = fs.readFileSync(fileCF, 'utf8');

        const ids2003 = extractIds(content2003);
        const idsCF = extractIds(contentCF);

        const diffs = [];

        // Check for changed IDs
        for (const [name, value] of Object.entries(ids2003)) {
            if (idsCF[name] !== undefined && idsCF[name] !== value) {
                diffs.push({ name, original: value, changed: idsCF[name], type: 'CHANGED' });
            }
        }

        // Check for removed IDs
        for (const [name, value] of Object.entries(ids2003)) {
            if (idsCF[name] === undefined) {
                // Check if the constant name exists at all in CF file
                if (!contentCF.includes(name)) {
                    diffs.push({ name, original: value, changed: null, type: 'REMOVED' });
                }
            }
        }

        return diffs;
    } catch (e) {
        return [];
    }
}

// FULL list of 151 different files from comparison
const sharedFiles = [
    'game-objects/banana-crate.js', 'game-objects/banana-tree.js', 'game-objects/bed.js',
    'game-objects/dummy.js', 'game-objects/hopper.js', 'game-objects/water-sources.js',
    'index.js', 'items/dye-mix.js', 'items/edible.js', 'items/quaffable.js',
    'npcs/al-kharid/border-guard.js', 'npcs/al-kharid/kebab-seller.js',
    'npcs/al-kharid/silk-trader.js', 'npcs/al-kharid/tanner.js', 'npcs/al-kharid/warrior.js',
    'npcs/ardougne/bartender.js', 'npcs/banker.js', 'npcs/barbarian-village/barbarian.js',
    'npcs/barbarian-village/peksa.js', 'npcs/certer.js', 'npcs/cow.js', 'npcs/dragon.js',
    'npcs/draynor/aggie.js', 'npcs/draynor/ned.js', 'npcs/dwarven-mine/drogo.js',
    'npcs/dwarven-mine/dwarven-shopkeeper.js', 'npcs/dwarven-mine/nurmof.js',
    'npcs/edgeville/monk.js', 'npcs/edgeville/shopkeeper.js', 'npcs/falador/barmaid.js',
    'npcs/falador/cassie.js', 'npcs/falador/flynn.js', 'npcs/falador/herquin.js',
    'npcs/falador/make-over-mage.js', 'npcs/falador/shopkeeper.js', 'npcs/falador/wayne.js',
    'npcs/falador/wyson.js', 'npcs/karamja/customs-officer.js', 'npcs/karamja/luthas.js',
    'npcs/karamja/shopkeeper.js', 'npcs/karamja/zambo.js', 'npcs/lumbridge/bob.js',
    'npcs/lumbridge/hans.js', 'npcs/lumbridge/shopkeeper.js', 'npcs/man.js', 'npcs/pirate.js',
    'npcs/port-sarim/bartender.js', 'npcs/port-sarim/betty.js', 'npcs/port-sarim/brian.js',
    'npcs/port-sarim/gerrant.js', 'npcs/port-sarim/grum.js', 'npcs/port-sarim/seamen.js',
    'npcs/port-sarim/wydin.js', 'npcs/rimmington/general-shopkeeper.js',
    'npcs/rimmington/rommik.js', 'npcs/seers-village/bartender.js', 'npcs/sheep.js',
    'npcs/taverley/gaius.js', 'npcs/taverley/jatix.js', 'npcs/thief.js',
    'npcs/varrock/apothecary.js', 'npcs/varrock/aubry.js', 'npcs/varrock/baraek.js',
    'npcs/varrock/blue-moon-bartender.js', 'npcs/varrock/dancing-donkey-bartender.js',
    'npcs/varrock/general-shopkeeper.js', 'npcs/varrock/horvik.js',
    'npcs/varrock/jolly-boar-bartender.js', 'npcs/varrock/lowe.js', 'npcs/varrock/reldo.js',
    'npcs/varrock/sword-shopkeeper.js', 'npcs/varrock/thessalia.js', 'npcs/varrock/thrander.js',
    'npcs/varrock/zaff.js', 'npcs/wilderness/fat-tony.js',
    'quests/free/black-knights-fortress/grill.js', 'quests/free/black-knights-fortress/guard.js',
    'quests/free/black-knights-fortress/hole.js', 'quests/free/black-knights-fortress/other-doors.js',
    'quests/free/black-knights-fortress/sir-amik-varze.js', 'quests/free/cooks-assistant.js',
    'quests/free/demon-slayer/captain-rovin.js', 'quests/free/demon-slayer/delrith.js',
    'quests/free/demon-slayer/drain.js', 'quests/free/demon-slayer/gypsy.js',
    'quests/free/demon-slayer/sir-prysin.js', 'quests/free/demon-slayer/traiborn.js',
    'quests/free/dorics-quest.js', 'quests/free/dragon-slayer/duke.js',
    'quests/free/dragon-slayer/dwarven-mine-chest.js', 'quests/free/dragon-slayer/elvarg.js',
    'quests/free/dragon-slayer/goblin-generals.js', 'quests/free/dragon-slayer/guildmaster.js',
    'quests/free/dragon-slayer/klarense.js', 'quests/free/dragon-slayer/lumbridge-lady.js',
    'quests/free/dragon-slayer/map.js', 'quests/free/dragon-slayer/melzars-maze-chest.js',
    'quests/free/dragon-slayer/melzars-maze-doors.js', 'quests/free/dragon-slayer/ned.js',
    'quests/free/dragon-slayer/oracle.js', 'quests/free/dragon-slayer/oziach.js',
    'quests/free/ernest-the-chicken/lever-doors.js', 'quests/free/ernest-the-chicken/oddenstein.js',
    'quests/free/ernest-the-chicken/piranhas.js', 'quests/free/ernest-the-chicken/veronica.js',
    'quests/free/goblin-diplomacy/dye-armour.js', 'quests/free/goblin-diplomacy/generals.js',
    'quests/free/imp-catcher.js', 'quests/free/knights-sword/cupboard.js',
    'quests/free/knights-sword/sir-vyvin.js', 'quests/free/knights-sword/squire.js',
    'quests/free/knights-sword/thurgo.js', 'quests/free/prince-ali-rescue/leela.js',
    'quests/free/prince-ali-rescue/osman.js', 'quests/free/prince-ali-rescue/prince-ali.js',
    'quests/free/sheep-shearer.js', 'quests/free/shield-of-arrav/black-arm-cupboard.js',
    'quests/free/shield-of-arrav/curator.js', 'quests/free/shield-of-arrav/king.js',
    'quests/free/shield-of-arrav/straven.js', 'quests/free/vampire-slayer/coffin.js',
    'quests/free/vampire-slayer/count-draynor.js', 'quests/free/vampire-slayer/dr-harlow.js',
    'quests/free/vampire-slayer/morgan.js', 'quests/free/witchs-potion.js',
    'quests/members/family-crest.js', 'quests/members/fishing-contest.js',
    'quests/members/legends-quest.js', 'quests/members/witchs-house.js',
    'skills/agility.js', 'skills/cooking/combinations.js', 'skills/cooking/cooking.js',
    'skills/cooking/dough.js', 'skills/cooking/wine.js', 'skills/crafting/dye-cape.js',
    'skills/crafting/gem-cutting.js', 'skills/crafting/jewellery.js', 'skills/crafting/leather.js',
    'skills/crafting/pottery.js', 'skills/crafting/spinning-wheel.js', 'skills/crafting/stringing.js',
    'skills/firemaking.js', 'skills/fishing.js', 'skills/fletching.js', 'skills/magic.js',
    'skills/mining.js', 'skills/prayer.js', 'skills/smithing/forging.js',
    'skills/smithing/smelting.js', 'skills/thieving.js', 'skills/woodcutting.js',
    'guilds/champions.js', 'guilds/cooks.js', 'guilds/crafting.js', 'guilds/mining.js', 'guilds/prayer.js',
    'items/casket.js', 'items/christmas-cracker.js', 'items/oyster.js', 'items/scrumpled-piece-of-paper.js',
    'items/sleeping-bag.js', 'items/war-ship.js', 'miniquests/barcrawl.js',
    'game-objects/climbable.js', 'game-objects/coffin.js', 'game-objects/dead-tree.js',
    'game-objects/draynor-manor-cupboard.js', 'game-objects/gate.js', 'game-objects/locked-door.js',
    'game-objects/manhole.js', 'game-objects/members-gates.js', 'game-objects/potato.js', 'game-objects/wheat.js'
];

function audit() {
    console.log('=== ID REGRESSION AUDIT ===');
    console.log('Checking if rsc-cloudflare changed any IDs from 2003scape originals\n');

    let totalChanges = 0;

    for (const file of sharedFiles) {
        const diffs = compareFile(file);
        if (diffs.length > 0) {
            console.log(`\n[${file}]`);
            for (const d of diffs) {
                if (d.type === 'CHANGED') {
                    console.log(`  CHANGED: ${d.name} = ${d.original} -> ${d.changed}`);
                } else {
                    console.log(`  REMOVED: ${d.name} = ${d.original}`);
                }
                totalChanges++;
            }
        }
    }

    if (totalChanges === 0) {
        console.log('No ID regressions found in sampled files.');
    } else {
        console.log(`\n=== TOTAL ID CHANGES: ${totalChanges} ===`);
    }
}

audit();
