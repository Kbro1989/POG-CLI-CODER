#!/usr/bin/env node
/**
 * CLI for managing Google API keys
 * Usage:
 *   node cli-keys.js add <name> <key>
 *   node cli-keys.js list
 *   node cli-keys.js remove <name>
 *   node cli-keys.js switch <name>
 */

import { KeyVault } from '../src/utils/KeyVault.js';

const vault = new KeyVault();

const command = process.argv[2];
const args = process.argv.slice(3);

function printUsage() {
    console.log(`
🔑 Google API Key Manager

Usage:
  cli-keys add <name> <key>       Add a new API key
  cli-keys list                    List all keys (masked)
  cli-keys remove <name>           Remove a key
  cli-keys switch <name>           Switch to a specific key

Examples:
  cli-keys add primary AIzaSyDOoSSyVk6Gk8tTbBAuCuCa0udOq-WN5g4
  cli-keys add backup AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ1234567
  cli-keys list
  cli-keys switch backup
`);
}

switch (command) {
    case 'add': {
        if (args.length < 2) {
            console.error('❌ Error: Requires <name> and <key>');
            printUsage();
            process.exit(1);
        }

        const [name, key] = args as [string, string];
        try {
            vault.addKey(name, key);
            console.log(`✅ Added key "${name}"`);
        } catch (error: any) {
            console.error(`❌ Error: ${error.message}`);
            process.exit(1);
        }
        break;
    }

    case 'list': {
        const keys = vault.listKeys();
        if (keys.length === 0) {
            console.log('📭 No API keys stored yet');
            console.log('\nAdd one with: cli-keys add <name> <key>');
            break;
        }

        console.log('\n🔑 Stored API Keys:\n');
        keys.forEach(({ name, masked, active, failCount }) => {
            const marker = active ? '★' : ' ';
            const status = failCount > 0 ? `(${failCount} fails)` : '';
            console.log(`  ${marker} ${name.padEnd(15)} ${masked}  ${status}`);
        });
        console.log('');
        break;
    }

    case 'remove': {
        if (args.length < 1) {
            console.error('❌ Error: Requires <name>');
            printUsage();
            process.exit(1);
        }

        const [name] = args as [string];
        vault.removeKey(name);
        console.log(`✅ Removed key "${name}"`);
        break;
    }

    case 'switch': {
        if (args.length < 1) {
            console.error('❌ Error: Requires <name>');
            printUsage();
            process.exit(1);
        }

        const [name] = args as [string];
        try {
            vault.switchTo(name);
            console.log(`✅ Switched to key "${name}"`);
        } catch (error: any) {
            console.error(`❌ Error: ${error.message}`);
            process.exit(1);
        }
        break;
    }

    default:
        printUsage();
        process.exit(command ? 1 : 0);
}
