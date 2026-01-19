/**
 * KeyVault - Secure storage and rotation for Google API keys
 * Features:
 * - AES-256 encryption at rest
 * - Automatic failover on rate limit/auth errors
 * - Simple add/list/remove operations
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import pino from 'pino';

const logger = pino({
    name: 'KeyVault',
    base: { hostname: 'POG-VIBE' }
});

interface KeyEntry {
    name: string;
    key: string;
    addedAt: number;
    lastUsed?: number;
    failCount: number;
}

interface VaultData {
    readonly version: number;
    readonly currentKey: string | null;
    readonly keys: ReadonlyArray<KeyEntry>;
}

export class KeyVault {
    private readonly keys: Map<string, KeyEntry> = new Map();
    private currentKeyName: string | null = null;
    private readonly vaultPath: string;
    private readonly algorithm = 'aes-256-cbc';
    constructor(pogDir?: string) {
        const root = pogDir || join(homedir(), '.pog-coder-vibe');
        this.vaultPath = join(root, 'keys.db');

        if (!existsSync(root)) {
            mkdirSync(root, { recursive: true });
        }

        this.load();
    }

    /**
     * Add a new API key to the vault
     */
    addKey(name: string, key: string): void {
        if (!key.startsWith('AIza')) {
            throw new Error('Invalid Google API key format (must start with AIza)');
        }

        this.keys.set(name, {
            name,
            key,
            addedAt: Date.now(),
            failCount: 0
        });

        // Set as current if it's the first key
        if (this.keys.size === 1) {
            this.currentKeyName = name;
        }

        this.save();
        logger.info({ name, masked: this.maskKey(key) }, 'API key added');
    }

    /**
     * Remove a key from the vault
     */
    removeKey(name: string): void {
        this.keys.delete(name);

        // Switch to another key if we removed the active one
        if (this.currentKeyName === name) {
            this.currentKeyName = this.keys.keys().next().value || null;
        }

        this.save();
        logger.info({ name }, 'API key removed');
    }

    /**
     * Get the current active API key
     */
    getCurrentKey(): string | null {
        if (!this.currentKeyName) return null;

        const entry = this.keys.get(this.currentKeyName);
        if (!entry) return null;

        // Update last used timestamp
        entry.lastUsed = Date.now();
        return entry.key;
    }

    /**
     * Rotate to next available key (called on API failure)
     */
    rotateKey(reason: 'rate_limit' | 'auth_error' | 'api_error'): boolean {
        if (!this.currentKeyName) return false;

        const currentEntry = this.keys.get(this.currentKeyName);
        if (currentEntry) {
            currentEntry.failCount++;
        }

        // Get all keys except current, sorted by fail count
        const candidates = Array.from(this.keys.entries())
            .filter(([name]) => name !== this.currentKeyName)
            .sort(([, a], [, b]) => a.failCount - b.failCount);

        if (candidates.length === 0) {
            logger.error('No backup API keys available for rotation');
            return false;
        }

        const [nextName] = candidates[0] as [string, KeyEntry];
        const oldKey = this.currentKeyName;
        this.currentKeyName = nextName;

        logger.warn({
            from: oldKey,
            to: nextName,
            reason
        }, 'API key rotated');

        return true;
    }

    /**
     * List all keys (with masked values)
     */
    listKeys(): Array<{ name: string; masked: string; active: boolean; failCount: number }> {
        return Array.from(this.keys.entries()).map(([name, entry]) => ({
            name,
            masked: this.maskKey(entry.key),
            active: name === this.currentKeyName,
            failCount: entry.failCount
        }));
    }

    /**
     * Manually switch to a specific key
     */
    switchTo(name: string): void {
        if (!this.keys.has(name)) {
            throw new Error(`Key not found: ${name}`);
        }

        this.currentKeyName = name;
        logger.info({ to: name }, 'Manually switched API key');
    }

    /**
     * Reset fail count for a key (after successful use)
     */
    resetFailCount(name?: string): void {
        const targetName = name || this.currentKeyName;
        if (!targetName) return;

        const entry = this.keys.get(targetName);
        if (entry) {
            entry.failCount = 0;
        }
    }

    // ══════════════════════════════════════════════════════════
    // Private: Encryption/Persistence
    // ══════════════════════════════════════════════════════════

    private maskKey(key: string): string {
        if (key.length < 12) return '****';
        return `${key.slice(0, 4)}****...${key.slice(-4)}`;
    }

    private getEncryptionKey(): Buffer {
        // Derive key from machine-specific info + static salt
        const machineId = process.env['COMPUTERNAME'] || process.env['HOSTNAME'] || 'default';
        const salt = 'pog-coder-vibe-salt-v1';
        return scryptSync(`${machineId}-${salt}`, 'salt', 32);
    }

    private encrypt(data: string): string {
        const key = this.getEncryptionKey();
        const iv = randomBytes(16);
        const cipher = createCipheriv(this.algorithm, key, iv);

        const encrypted = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);

        // Return: IV + encrypted data (hex)
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }

    private decrypt(data: string): string {
        const key = this.getEncryptionKey();
        const [ivHex, encryptedHex] = data.split(':');

        const iv = Buffer.from(ivHex || '', 'hex');
        const encrypted = Buffer.from(encryptedHex || '', 'hex');

        const decipher = createDecipheriv(this.algorithm, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    }

    private save(): void {
        const data = {
            version: 1,
            currentKey: this.currentKeyName,
            keys: Array.from(this.keys.values())
        };

        const encrypted = this.encrypt(JSON.stringify(data));
        writeFileSync(this.vaultPath, encrypted, 'utf8');
    }

    private load(): void {
        if (!existsSync(this.vaultPath)) {
            logger.info('No existing key vault found, starting fresh');
            return;
        }

        try {
            const encrypted = readFileSync(this.vaultPath, 'utf8');
            const decrypted = this.decrypt(encrypted);
            const data = JSON.parse(decrypted) as VaultData;

            if (data && typeof data === 'object') {
                this.currentKeyName = data.currentKey ?? null;
                if (Array.isArray(data.keys)) {
                    data.keys.forEach((entry: KeyEntry) => {
                        this.keys.set(entry.name, entry);
                    });
                }
            }

            logger.info({ keyCount: this.keys.size }, 'Key vault loaded');
        } catch (error) {
            logger.error({ error }, 'Failed to load key vault (may be corrupted)');
        }
    }
}
