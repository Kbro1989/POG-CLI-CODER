const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../node_modules/@ledgerhq/compressjs/src/lib/BWTC.js');

console.log(`[Fix-BWTC] Looking for file at: ${filePath}`);

if (fs.existsSync(filePath)) {
    console.log('[Fix-BWTC] File found. Reading content...');
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Check if already properly declared
    if (content.includes('var BWTC = {};')) {
        console.log('[Fix-BWTC] "var BWTC = {};" found. Checking for bad pattern...');
        if (!content.includes('Object.create(null)')) {
            console.log('[Fix-BWTC] File is already correctly patched. Exiting.');
            process.exit(0);
        } else {
            console.log('[Fix-BWTC] Found "var BWTC = {};" BUT also "Object.create(null)". fixing...');
        }
    }

    let patched = false;

    // 2. Try Standard Regex Replacement
    const regex = /var\s+BWTC\s*=\s*Object\.create\(null\);/;
    if (regex.test(content)) {
        console.log('[Fix-BWTC] Found "Object.create(null)" pattern. Replacing...');
        content = content.replace(regex, 'var BWTC = {};');
        patched = true;
    }

    // 3. Fallback: If still not present, force injection at the top.
    if (!content.includes('var BWTC = {};')) {
        console.log('[Fix-BWTC] "var BWTC = {};" still NOT found. Force injecting at top of file...');
        // We inject it right after any potential requires or strict mode, or just at the very top.
        // Safest is to prepend it, but let's put it after "use strict" if exists, or just at the start.
        content = 'var BWTC = {};\n' + content;
        patched = true;
    }

    if (patched) {
        fs.writeFileSync(filePath, content);
        console.log('[Fix-BWTC] Patch applied successfully.');
    } else {
        console.log('[Fix-BWTC] No changes needed (logic fell through).');
    }

} else {
    console.warn('[Fix-BWTC] BWTC.js not found at expected path. Skipping.');
}
