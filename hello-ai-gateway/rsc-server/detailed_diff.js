
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repo2003 = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/2003scape-repo/src/plugins';
const repoCF = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/src/plugins';

// List of 151 different files from previous comparison
const diffFiles = [
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
    'skills/smithing/smelting.js', 'skills/thieving.js', 'skills/woodcutting.js'
];

function lineDiff(file2003, fileCF) {
    const lines2003 = fs.readFileSync(file2003, 'utf8').split('\n');
    const linesCF = fs.readFileSync(fileCF, 'utf8').split('\n');
    return { added: linesCF.length - lines2003.length, total2003: lines2003.length, totalCF: linesCF.length };
}

function analyze() {
    console.log('=== DETAILED DIFF ANALYSIS: 2003scape vs rsc-cloudflare ===\n');
    console.log('Legend: [+N] lines added, [-N] lines removed (net change)\n');

    const categories = { quests: [], skills: [], npcs: [], gameObjects: [], items: [], other: [] };

    for (const file of diffFiles) {
        const file2003 = path.join(repo2003, file).replace(/\\/g, '/');
        const fileCF = path.join(repoCF, file).replace(/\\/g, '/');

        try {
            const diff = lineDiff(file2003, fileCF);
            const change = diff.added >= 0 ? `+${diff.added}` : `${diff.added}`;
            const entry = { file, change, lines2003: diff.total2003, linesCF: diff.totalCF };

            if (file.startsWith('quests/')) categories.quests.push(entry);
            else if (file.startsWith('skills/')) categories.skills.push(entry);
            else if (file.startsWith('npcs/')) categories.npcs.push(entry);
            else if (file.startsWith('game-objects/')) categories.gameObjects.push(entry);
            else if (file.startsWith('items/')) categories.items.push(entry);
            else categories.other.push(entry);
        } catch (e) {
            console.error(`Error processing ${file}: ${e.message}`);
        }
    }

    for (const [cat, entries] of Object.entries(categories)) {
        if (entries.length === 0) continue;
        console.log(`\n--- ${cat.toUpperCase()} (${entries.length} files) ---`);
        for (const e of entries) {
            console.log(`  [${e.change}] ${e.file}  (${e.lines2003} -> ${e.linesCF} lines)`);
        }
    }

    // Summary
    let totalAdded = 0, totalRemoved = 0;
    for (const entries of Object.values(categories)) {
        for (const e of entries) {
            const n = parseInt(e.change);
            if (n > 0) totalAdded += n;
            else totalRemoved += Math.abs(n);
        }
    }
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total lines ADDED across all modified files: +${totalAdded}`);
    console.log(`Total lines REMOVED across all modified files: -${totalRemoved}`);
    console.log(`Net change: ${totalAdded - totalRemoved >= 0 ? '+' : ''}${totalAdded - totalRemoved} lines`);
}

analyze();
