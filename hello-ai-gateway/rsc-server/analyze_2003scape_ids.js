/**
 * 2003scape ID Usage Analyzer
 * Scans all source files to find every ID and what uses it
 */

const fs = require('fs');
const path = require('path');

const repo2003 = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/2003scape-repo/src';
const dataPath = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/rsc-data-local/config';

// Storage for all found IDs
const idUsage = {
    items: {},   // id -> { name, usages: [{file, line, context}] }
    npcs: {},
    objects: {}
};

// Load config data for ID->Name mapping
function loadConfigs() {
    try {
        const items = JSON.parse(fs.readFileSync(path.join(dataPath, 'items.json'), 'utf8'));
        const npcs = JSON.parse(fs.readFileSync(path.join(dataPath, 'npcs.json'), 'utf8'));
        const objects = JSON.parse(fs.readFileSync(path.join(dataPath, 'objects.json'), 'utf8'));
        return { items, npcs, objects };
    } catch (e) {
        console.error('Error loading configs:', e.message);
        return { items: [], npcs: [], objects: [] };
    }
}

// Get all JS files recursively
function getFiles(dir) {
    const results = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory() && !item.name.includes('node_modules')) {
                results.push(...getFiles(fullPath));
            } else if (item.name.endsWith('.js')) {
                results.push(fullPath);
            }
        }
    } catch { }
    return results;
}

// Extract ID definitions from a file
function extractIDs(filePath, content) {
    const results = [];
    const lines = content.split('\n');

    // Pattern: const NAME_ID = 123 or NAME: 123
    const patterns = [
        { regex: /const\s+([A-Z_][A-Z0-9_]*(?:_ID)?)\s*=\s*(\d+)/g, type: 'const' },
        { regex: /([A-Z_][A-Z0-9_]*(?:_ID)?)\s*:\s*(\d+)/g, type: 'object' },
        { regex: /Items\.([A-Z_][A-Z0-9_]*)/g, type: 'Items' },
        { regex: /Npcs\.([A-Z_][A-Z0-9_]*)/g, type: 'Npcs' },
        { regex: /Objects\.([A-Z_][A-Z0-9_]*)/g, type: 'Objects' }
    ];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        for (const pattern of patterns) {
            let match;
            const regex = new RegExp(pattern.regex.source, 'g');
            while ((match = regex.exec(line)) !== null) {
                results.push({
                    name: match[1],
                    value: match[2] ? parseInt(match[2]) : null,
                    type: pattern.type,
                    line: i + 1,
                    context: line.trim().substring(0, 100)
                });
            }
        }
    }

    return results;
}

// Find all usages of a specific number in files
function findUsages(files, targetId) {
    const usages = [];

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
                // Look for the number as a standalone value
                const regex = new RegExp(`\\b${targetId}\\b`, 'g');
                if (regex.test(lines[i])) {
                    usages.push({
                        file: file.replace(repo2003 + '/', '').replace(/\\/g, '/'),
                        line: i + 1,
                        context: lines[i].trim().substring(0, 120)
                    });
                }
            }
        } catch { }
    }

    return usages;
}

// Main analysis
function analyze() {
    console.log('=== 2003SCAPE ID USAGE ANALYZER ===\n');
    console.log('Loading configurations...');

    const configs = loadConfigs();
    console.log(`Loaded: ${configs.items.length} items, ${configs.npcs.length} NPCs, ${configs.objects.length} objects\n`);

    console.log('Scanning source files...');
    const files = getFiles(repo2003);
    console.log(`Found ${files.length} JavaScript files\n`);

    // Collect all ID definitions
    const allDefs = [];
    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const defs = extractIDs(file, content);
            for (const def of defs) {
                def.file = file.replace(repo2003 + '/', '').replace(/\\/g, '/');
                allDefs.push(def);
            }
        } catch { }
    }

    console.log(`Found ${allDefs.length} ID definitions/references\n`);

    // Group by ID value
    const byValue = {};
    for (const def of allDefs) {
        if (def.value !== null) {
            if (!byValue[def.value]) {
                byValue[def.value] = { defs: [], name: null };
            }
            byValue[def.value].defs.push(def);

            // Try to get name from config
            if (configs.items[def.value]) {
                byValue[def.value].itemName = configs.items[def.value].name;
            }
            if (configs.npcs[def.value]) {
                byValue[def.value].npcName = configs.npcs[def.value].name;
            }
            if (configs.objects[def.value]) {
                byValue[def.value].objectName = configs.objects[def.value].name;
            }
        }
    }

    // Output report
    console.log('=== ID USAGE REPORT ===\n');

    // Sort by ID value
    const sortedIds = Object.keys(byValue).map(Number).sort((a, b) => a - b);

    let outputLines = [];
    outputLines.push('# 2003scape ID Usage Report\n');
    outputLines.push(`Total unique IDs found: ${sortedIds.length}\n`);
    outputLines.push('---\n');

    for (const id of sortedIds) {
        const data = byValue[id];
        let names = [];
        if (data.itemName) names.push(`Item: ${data.itemName}`);
        if (data.npcName) names.push(`NPC: ${data.npcName}`);
        if (data.objectName) names.push(`Object: ${data.objectName}`);

        outputLines.push(`\n## ID ${id}`);
        if (names.length > 0) {
            outputLines.push(`**Config Names**: ${names.join(' | ')}`);
        }
        outputLines.push(`**Used in ${data.defs.length} location(s)**:\n`);

        for (const def of data.defs.slice(0, 10)) { // Limit to 10 per ID
            outputLines.push(`- \`${def.file}:${def.line}\` - ${def.name || 'inline'}`);
            outputLines.push(`  \`${def.context}\``);
        }

        if (data.defs.length > 10) {
            outputLines.push(`- ... and ${data.defs.length - 10} more locations`);
        }
    }

    // Write to file
    const outputPath = 'c:/Users/Destiny/Desktop/ai-architect-mmorpg/copy-of-rsc-evolution-ai/rsc-cloudflare/rsc-server/2003scape_id_usage_report.md';
    fs.writeFileSync(outputPath, outputLines.join('\n'));

    console.log(`Report written to: ${outputPath}`);
    console.log(`\nSummary: ${sortedIds.length} unique IDs analyzed across ${files.length} files`);
}

analyze();
