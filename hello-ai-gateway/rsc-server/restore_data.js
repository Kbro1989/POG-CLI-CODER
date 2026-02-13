/**
 * RSC Data Restoration Script
 * Fixes corrupted entries while preserving additions
 */

const fs = require('fs');
const path = require('path');

const ORIGINAL = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/2003scape-repo/node_modules/@2003scape/rsc-data';
const LOCAL = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/rsc-data-local';

function fixArrayFile(fileName, indices) {
    const origPath = path.join(ORIGINAL, fileName);
    const localPath = path.join(LOCAL, fileName);

    console.log(`\nFixing ${fileName}...`);

    const origData = JSON.parse(fs.readFileSync(origPath, 'utf8'));
    const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));

    for (const index of indices) {
        console.log(`  Restoring index ${index}: "${origData[index].name}"`);
        localData[index] = origData[index];
    }

    // Backup
    fs.writeFileSync(localPath + '.backup', JSON.stringify(JSON.parse(fs.readFileSync(localPath, 'utf8')), null, 2));

    // Write fixed data
    fs.writeFileSync(localPath, JSON.stringify(localData, null, 2));
    console.log(`  Saved ${fileName}`);
}

function fixObjectFile(fileName, keys) {
    const origPath = path.join(ORIGINAL, fileName);
    const localPath = path.join(LOCAL, fileName);

    console.log(`\nFixing ${fileName}...`);

    const origData = JSON.parse(fs.readFileSync(origPath, 'utf8'));
    const localData = JSON.parse(fs.readFileSync(localPath, 'utf8'));

    for (const key of keys) {
        console.log(`  Restoring key "${key}"`);
        localData[key] = origData[key];
    }

    // Backup
    fs.writeFileSync(localPath + '.backup', JSON.stringify(JSON.parse(fs.readFileSync(localPath, 'utf8')), null, 2));

    // Write fixed data
    fs.writeFileSync(localPath, JSON.stringify(localData, null, 2));
    console.log(`  Saved ${fileName}`);
}

function main() {
    console.log('=== RSC DATA RESTORATION ===\n');

    // 1. Fix config/objects.json - restore Totem Poles and fix HTML encoding
    fixArrayFile('config/objects.json', [77, 360, 1128, 1169, 1170]);

    // 2. Fix config/spells.json - restore correct rune ID 619 for wave spells
    fixArrayFile('config/spells.json', [33, 34, 35, 37, 39, 43, 45, 47]);

    // 3. Fix edible.json - restore original heal value for item 350
    fixObjectFile('edible.json', ['350']);

    // 4. Keep ranged.json as-is - the "190" addition might be intentional
    console.log('\n[SKIPPED] ranged.json - Addition of item 190 appears intentional');

    // 5. shops.json - need to check what changed
    // This needs manual review as the diff was truncated
    console.log('\n[MANUAL REVIEW NEEDED] shops.json - Check zanaris-general shop');

    console.log('\n=== RESTORATION COMPLETE ===');
    console.log('Backup files created with .backup extension');
}

main();
