import { existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { homedir } from 'os';
import pino from 'pino';

const logger = pino({ name: 'SystemEnvChecker' });

export interface EnvStatus {
    key: string;
    value: string | boolean;
    active: boolean;
    source: 'env' | 'fs' | 'config' | 'path';
}

export class SystemEnvChecker {
    private static readonly SENSITIVE_KEYS = [
        'GOOGLE_API_KEY',
        'GEMINI_API_KEY',
        'CLOUDFLARE_API_TOKEN',
        'FIREWORKS_API_KEY',
        'ANTHROPIC_API_KEY'
    ];

    static async checkGlobalSettings(): Promise<EnvStatus[]> {
        const status: EnvStatus[] = [];

        // 1. Check Process Environment
        for (const key of this.SENSITIVE_KEYS) {
            const val = process.env[key];
            status.push({
                key,
                value: val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : 'NOT_SET',
                active: !!val,
                source: 'env'
            });
        }

        // 2. Check for SSH Keys
        const sshDir = join(homedir(), '.ssh');
        if (existsSync(sshDir)) {
            try {
                const files = readdirSync(sshDir);
                const hasKeys = files.some(f => f.startsWith('id_') && !f.endsWith('.pub'));
                status.push({
                    key: 'SSH_KEYS',
                    value: hasKeys ? `${files.filter(f => !f.endsWith('.pub')).length} keys found` : 'None',
                    active: hasKeys,
                    source: 'fs'
                });
            } catch (err) {
                logger.warn({ err }, 'Failed to read .ssh directory');
            }
        }

        // 3. Check for Gemini/Ollama CLI Readiness via Path Lookup
        const geminiReady = this.commandExists('gemini');
        const ollamaReady = this.commandExists('ollama');

        status.push({
            key: 'GEMINI_CLI_READY',
            value: geminiReady,
            active: geminiReady,
            source: 'path'
        });

        status.push({
            key: 'OLLAMA_CLI_READY',
            value: ollamaReady,
            active: ollamaReady,
            source: 'path'
        });

        return status;
    }

    private static commandExists(command: string): boolean {
        try {
            const cmd = process.platform === 'win32' ? 'where' : 'which';
            execSync(`${cmd} ${command}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }



    static async getActiveSettingsMap(): Promise<Record<string, any>> {
        const statuses = await this.checkGlobalSettings();
        return statuses.reduce((acc, s) => {
            acc[s.key] = s.active;
            return acc;
        }, {} as Record<string, any>);
    }
}
