/**
 * Detailed Data Diff - Shows exactly what changed
 */

const fs = require('fs');
const path = require('path');

const ORIGINAL = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/2003scape-repo/node_modules/@2003scape/rsc-data';
const LOCAL = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/rsc-data-local';

function detailedDiff(origPath, localPath, name) {
    console.log(`\n=== ${name} ===`);

    try {
        const origData = JSON.parse(fs.readFileSync(origPath, 'utf8'));
        const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));

        if (Array.isArray(origData)) {
            for (let i = 0; i < origData.length; i++) {
                const origItem = origData[i];
                const localItem = localData[i];

                if (JSON.stringify(origItem) !== JSON.stringify(localItem)) {
                    console.log(`\n[INDEX ${i}] DIFFERS:`);
                    console.log(`  ORIGINAL: ${JSON.stringify(origItem, null, 2).substring(0, 500)}`);
                    console.log(`  LOCAL: ${JSON.stringify(localItem, null, 2).substring(0, 500)}`);
                }
            }
        } else {
            for (const key of Object.keys(origData)) {
                if (JSON.stringify(origData[key]) !== JSON.stringify(localData[key])) {
                    console.log(`\n[KEY "${key}"] DIFFERS:`);
                    console.log(`  ORIGINAL: ${JSON.stringify(origData[key], null, 2).substring(0, 500)}`);
                    console.log(`  LOCAL: ${JSON.stringify(localData[key], null, 2).substring(0, 500)}`);
                }
            }
        }
    } catch (e) {
        console.log(`  ERROR: ${e.message}`);
    }
}

// Check the modified files
detailedDiff(
    path.join(ORIGINAL, 'edible.json'),
    path.join(LOCAL, 'edible.json'),
    'edible.json'
);

detailedDiff(
    path.join(ORIGINAL, 'ranged.json'),
    path.join(LOCAL, 'ranged.json'),
    'ranged.json'
);

detailedDiff(
    path.join(ORIGINAL, 'shops.json'),
    path.join(LOCAL, 'shops.json'),
    'shops.json'
);

detailedDiff(
    path.join(ORIGINAL, 'config/objects.json'),
    path.join(LOCAL, 'config/objects.json'),
    'config/objects.json'
);

detailedDiff(
    path.join(ORIGINAL, 'config/spells.json'),
    path.join(LOCAL, 'config/spells.json'),
    'config/spells.json'
);
