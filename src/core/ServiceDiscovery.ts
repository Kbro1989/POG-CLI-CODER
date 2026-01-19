import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { VibeConfig } from './models.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const coreRoot = join(__dirname, '../..');

export interface ServiceStatus {
    readonly id: string;
    readonly name: string;
    readonly status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    readonly enabled: boolean;
    readonly details?: string;
    readonly type: 'API' | 'EXTENSION' | 'MCP';
}

export class ServiceDiscovery {
    constructor(private config: VibeConfig) { }

    async auditAll(): Promise<ServiceStatus[]> {
        const results: ServiceStatus[] = [];

        // 1. Audit APIs
        results.push(this.withEnabled(await this.checkGemini()));
        results.push(this.withEnabled(await this.checkOllama()));

        // 2. Audit Extensions (GCloud SDKs)
        const extensions = await this.checkCloudExtensions();
        results.push(...extensions.map(ext => this.withEnabled(ext)));

        // 3. Audit MCP Servers (Simulated/Config-based)
        results.push(this.withEnabled(await this.checkMCPServers()));

        return results;
    }

    private isServiceAuthorized(id: string): boolean {
        const lowerId = id.toLowerCase();
        return this.config.enabledServices.some(s => s.toLowerCase() === lowerId);
    }

    private withEnabled(status: Omit<ServiceStatus, 'enabled'>): ServiceStatus {
        const enabled = this.isServiceAuthorized(status.id);
        return { ...status, enabled } as ServiceStatus;
    }

    private async checkGemini(): Promise<Omit<ServiceStatus, 'enabled'>> {
        const apiKey = process.env['GOOGLE_API_KEY'];

        if (!apiKey) {
            return { id: 'gemini', name: 'Gemini 2.0 API', status: 'INACTIVE', type: 'API', details: 'No API key in .env' };
        }

        try {
            const genAI = new GoogleGenAI({ apiKey });
            // Minor ping just to verify key/connectivity using the native models interface
            await genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
            });
            return { id: 'gemini', name: 'Gemini 2.0 API', status: 'ACTIVE', type: 'API' };
        } catch (e) {
            return { id: 'gemini', name: 'Gemini 2.0 API', status: 'ERROR', type: 'API', details: (e as Error).message };
        }
    }

    private async checkOllama(): Promise<Omit<ServiceStatus, 'enabled'>> {
        try {
            // Ping Ollama endpoint
            const response = await fetch('http://localhost:11434/api/tags');
            if (response.ok) {
                return { id: 'ollama', name: 'Ollama Local', status: 'ACTIVE', type: 'API' };
            }
            return { id: 'ollama', name: 'Ollama Local', status: 'INACTIVE', type: 'API', details: 'Service unreachable' };
        } catch {
            return { id: 'ollama', name: 'Ollama Local', status: 'INACTIVE', type: 'API' };
        }
    }

    private async checkCloudExtensions(): Promise<Omit<ServiceStatus, 'enabled'>[]> {
        const extensions: Omit<ServiceStatus, 'enabled'>[] = [
            { id: 'healthcare', name: 'Healthcare AI', status: 'INACTIVE', type: 'EXTENSION' },
            { id: 'documentai', name: 'Document AI', status: 'INACTIVE', type: 'EXTENSION' },
            { id: 'vision', name: 'Cloud Vision', status: 'INACTIVE', type: 'EXTENSION' },
            { id: 'mediaforge', name: 'Media Forge', status: 'INACTIVE', type: 'EXTENSION' }
        ];

        let deps: Record<string, string> = {};
        try {
            const pkgPath = join(this.config.projectRoot, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                deps = { ...pkg.dependencies, ...pkg.devDependencies };
            }
        } catch { }

        const corePkgPath = join(coreRoot, 'package.json');
        let coreDeps: Record<string, string> = {};
        try {
            if (fs.existsSync(corePkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(corePkgPath, 'utf8'));
                coreDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            }
        } catch { }

        const hasKey = !!process.env['GOOGLE_API_KEY'];

        return extensions.map(ext => {
            const id = ext.id;
            const depKey = `@google-cloud/${id === 'healthcare' ? 'healthcare' : id === 'documentai' ? 'document-ai' : 'vision'}`;
            const isInstalled = !!deps[depKey] || !!coreDeps[depKey];
            const isAuthorized = this.isServiceAuthorized(id);

            if (isAuthorized && hasKey) {
                return {
                    ...ext,
                    status: 'ACTIVE',
                    details: isInstalled ? 'Substrate: READY (Native)' : 'Substrate: READY (Cloud)'
                };
            }

            if (isInstalled) {
                return { ...ext, status: 'ACTIVE', details: 'Installed (Wait for Authorization)' };
            }

            return ext;
        });
    }

    private async checkMCPServers(): Promise<Omit<ServiceStatus, 'enabled'>> {
        try {
            const hasGitKraken = fs.existsSync(join(this.config.projectRoot, '.gitkraken'));
            const hasGit = fs.existsSync(join(this.config.projectRoot, '.git'));
            const isEnabled = this.isServiceAuthorized('mcp_gitkraken');
            const isActive = hasGitKraken || hasGit || isEnabled;

            return {
                id: 'mcp_gitkraken',
                name: 'MCP GitKraken',
                status: isActive ? 'ACTIVE' : 'INACTIVE',
                type: 'MCP',
                details: isActive
                    ? (isEnabled ? 'Substrate: READY (Coalesced)' : 'Detected: Path Active')
                    : 'Awaiting discovery'
            };
        } catch {
            return { id: 'mcp_gitkraken', name: 'MCP GitKraken', status: 'INACTIVE', type: 'MCP' };
        }
    }
}

