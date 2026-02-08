import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { PreviewServer } from '../../core/PreviewServer.js';
import * as fs from 'fs';
import { join } from 'path';

/**
 * DashboardLimb - Session-specific QOL Control Plane
 * Generates and serves a "Straight Up & Brilliant" HTML UI.
 * 
 * Migrated to ToolingSpine for standardized orchestration.
 */
export class DashboardLimb extends BaseLimb {
    readonly id = 'dashboard';
    readonly type = 'maintenance' as const;

    private dashboardDir: string;

    constructor(
        config: VibeConfig,
        private readonly previewServer: PreviewServer
    ) {
        super(config);
        this.dashboardDir = join(this.config.pogDir, 'session_dashboards', this.config.projectId);
        this.registerDashboardTools();
    }

    private registerDashboardTools(): void {
        this.registerTools([
            {
                name: 'show_dashboard',
                description: 'Activate and open the session dashboard UI.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                handler: async () => {
                    const result = await this.activate();
                    if (result.ok) return { ok: true, value: `Dashboard activated: ${result.value.output}` };
                    return result;
                }
            },
            {
                name: 'update_dashboard',
                description: 'Refresh or update the dashboard assets.',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                },
                handler: async () => {
                    this.generateAssets();
                    return { ok: true, value: 'Dashboard assets updated successfully.' };
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();
        return p.includes('dashboard') || p.includes('show interface') || p.includes('ui') || this.spine.getCapabilities().some(cap => p.includes(cap));
    }

    override async execute(intent: Intent): Promise<Result<Execution>> {
        const p = intent.prompt.toLowerCase();
        if (p.includes('show') || p.includes('start') || p.includes('open')) {
            return this.activate();
        }
        return { ok: true, value: { output: 'Dashboard is active in the background.' } };
    }

    async activate(): Promise<Result<Execution>> {
        try {
            if (!fs.existsSync(this.dashboardDir)) {
                fs.mkdirSync(this.dashboardDir, { recursive: true });
            }

            // Generate Assets
            this.generateAssets();

            // Start Preview Server for the dashboard
            const port = this.config.wsPort + 1;
            const result = await this.previewServer.startPreview(
                'POG-DASHBOARD',
                this.dashboardDir,
                `npx -y http-server . -p ${port}`,
                port
            );

            if (!result.ok) return { ok: false, error: result.error };

            return {
                ok: true,
                value: {
                    output: `Dashboard activated: ${result.value.url}`,
                    data: { url: result.value.url, port }
                }
            };
        } catch (error) {
            return { ok: false, error: error as Error };
        }
    }

    private generateAssets(): void {
        const workspaceOptions = (this.config.workspaces || [this.config.projectRoot])
            .map(w => `<option value="${w.replace(/\\/g, '\\\\')}" ${w === this.config.projectRoot ? 'selected' : ''}>${w.split(/[\\/]/).pop()}</option>`)
            .join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POG-CODER-VIBE | ${this.config.projectId}</title>
    <link rel="stylesheet" href="styles.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body class="vibe-theme">
    <div class="glass-container">
        <header>
            <div class="logo">POG-VIBE <span>CORE</span></div>
            <div class="workspace-selector">
                <select id="workspace-select" onchange="switchWorkspace(this.value)">
                    ${workspaceOptions}
                </select>
            </div>
                <nav class="tab-nav">
                <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
                <button class="tab-btn" data-tab="ai">AI Pipeline</button>
                <button class="tab-btn" data-tab="terminal">Terminal</button>
                <button class="tab-btn" data-tab="health">Health</button>
                <button class="tab-btn" data-tab="media">Media Forge</button>
                <button class="tab-btn" data-tab="docs">Docs</button>
                <button class="tab-btn" data-tab="settings">Settings</button>
            </nav>
            <div class="status-indicator">
                <span id="ws-status" class="status-dot"></span>
                <span id="ws-text">Connecting...</span>
            </div>
        </header>

        <main class="viewport">
            <div id="dashboard" class="tab-content active">
                <div class="grid-layout">
                    <section class="panel side-panel">
                        <h3><span class="icon">📜</span> LIVE AUDIT</h3>
                        <div id="log-container" class="scroll-box"></div>
                    </section>
                    <section class="panel main-panel">
                        <h3><span class="icon">👁️</span> MODEL VIEWER</h3>
                        <div id="viewer-canvas-container" class="canvas-box premium-loader">
                            <div class="cube-loader">
                                <div class="cube cube1"></div>
                                <div class="cube cube2"></div>
                                <div class="cube cube3"></div>
                                <div class="cube cube4"></div>
                            </div>
                            <div class="loader-text">NEURAL ENGINE ACTIVE</div>
                        </div>
                    </section>
                    <section class="panel side-panel">
                        <h3><span class="icon">🧠</span> RECENT INTENTS</h3>
                        <div id="intent-list" class="scroll-box"></div>
                    </section>
                </div>
            </div>

            <div id="ai" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel full-panel">
                        <h3><span class="icon">🤖</span> AI CAPABILITIES & CONTEXT</h3>
                        <div class="pipeline-grid">
                            <div class="pipeline-section">
                                <h4>PINNED CONTEXT (SOLDIERED)</h4>
                                <div id="pinned-files-list" class="scroll-box mini-list">
                                    <p class="muted">No files pinned.</p>
                                </div>
                                <div id="context-preview" class="context-preview-box">
                                    <h4 id="preview-title">File Preview</h4>
                                    <pre id="preview-content" class="preview-code">Select a pinned file to preview...</pre>
                                </div>
                            </div>
                            <div class="pipeline-section">
                                <h4>MODEL GALLERY (CATEGORIZED)</h4>
                                <div id="model-gallery" class="scroll-box gallery-view">
                                    <p class="muted">Loading model inventory...</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div id="terminal" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel full-panel">
                        <h3><span class="icon">💻</span> SYSTEM TERMINAL</h3>
                        <div id="terminal-view" class="scroll-box terminal-style">
                            <div id="terminal-header" class="terminal-meta">Process: PowerShell Extension (14528) | Status: <span id="term-status-val">Active</span></div>
                            <div id="terminal-body" class="terminal-output">
                                <pre id="terminal-content">Initializing cognitive terminal link...</pre>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div id="health" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel full-panel">
                        <h3><span class="icon">📊</span> SYSTEM HEALTH</h3>
                        <div class="health-grid">
                            <div class="health-gauge">
                                <div class="gauge-label">CPU LOAD</div>
                                <div class="gauge-ring">
                                    <svg viewBox="0 0 100 100">
                                        <circle class="gauge-bg" cx="50" cy="50" r="45"/>
                                        <circle id="cpu-gauge" class="gauge-fg cpu" cx="50" cy="50" r="45" stroke-dasharray="0 283"/>
                                    </svg>
                                    <div id="cpu-pct" class="gauge-value">--</div>
                                </div>
                            </div>
                            <div class="health-gauge">
                                <div class="gauge-label">MEMORY</div>
                                <div class="gauge-ring">
                                    <svg viewBox="0 0 100 100">
                                        <circle class="gauge-bg" cx="50" cy="50" r="45"/>
                                        <circle id="mem-gauge" class="gauge-fg mem" cx="50" cy="50" r="45" stroke-dasharray="0 283"/>
                                    </svg>
                                    <div id="mem-pct" class="gauge-value">--</div>
                                </div>
                            </div>
                            <div class="health-gauge">
                                <div class="gauge-label">DISK I/O</div>
                                <div class="gauge-ring">
                                    <svg viewBox="0 0 100 100">
                                        <circle class="gauge-bg" cx="50" cy="50" r="45"/>
                                        <circle id="disk-gauge" class="gauge-fg disk" cx="50" cy="50" r="45" stroke-dasharray="0 283"/>
                                    </svg>
                                    <div id="disk-pct" class="gauge-value">--</div>
                                </div>
                            </div>
                        </div>
                        <div id="health-history" class="scroll-box">
                            <h4>System Events</h4>
                            <div id="health-events"></div>
                        </div>
                        <div id="env-status-section" class="scroll-box mt-20">
                            <h4>Active Environment Status</h4>
                            <div id="env-status-grid" class="env-status-view">
                                <p class="muted">Detecting global settings...</p>
                            </div>
                        </div>
                        <div id="env-status-section" class="scroll-box mt-20">
                            <h4>Active Environment Status</h4>
                            <div id="env-status-grid" class="env-status-view">
                                <p class="muted">Detecting global settings...</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <div id="settings" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel settings-panel">
                        <h3><span class="icon">⚙️</span> CORE SETTINGS</h3>
                        <div class="settings-grid">
                            ${this.config.enabledServices.map(s => `
                                <div class="setting-item">
                                    <label>${s.toUpperCase()}</label>
                                    <label class="switch">
                                        <input type="checkbox" checked onchange="toggleService('${s}', this.checked)">
                                        <span class="slider round"></span>
                                    </label>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>
            </div>
        </main>

        <footer>
            <div class="model-health">
                <div class="model-tag gemini">Gemini: <span id="gemini-status">IDLE</span></div>
                <div class="model-tag ollama">Ollama: <span id="ollama-status">IDLE</span></div>
            </div>
            <div class="terminal-stats">
                 CPU: <span id="cpu-load">--</span> | MEM: <span id="mem-usage">--</span>
            </div>
        </footer>
    </div>
    <script src="main.js"></script>
</body>
</html>`;

        const css = `:root {
    --bg-dark: #050505;
    --accent-primary: #00f2ff;
    --accent-secondary: #ff00ea;
    --glass-bg: rgba(15, 15, 15, 0.7);
    --text-main: #e0e0e0;
    --text-muted: #888;
    --border-radius: 12px;
}

body { margin: 0; padding: 0; background: var(--bg-dark); color: var(--text-main); font-family: 'Inter', sans-serif; overflow: hidden; }
.vibe-theme {
    background: radial-gradient(circle at top right, #1a0033, #050505 50%),
                radial-gradient(circle at bottom left, #001a1a, #050505 50%);
    height: 100vh;
}
.glass-container { display: flex; flex-direction: column; height: 100vh; padding: 20px; box-sizing: border-box; }
header {
    display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;
    background: var(--glass-bg); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1);
    border-radius: var(--border-radius); margin-bottom: 20px;
}
.workspace-selector select {
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--accent-primary);
    padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; outline: none; cursor: pointer;
}
.tab-nav { display: flex; gap: 10px; }
.tab-btn {
    background: transparent; border: 1px solid rgba(255,255,255,0.1); color: var(--text-muted);
    padding: 8px 15px; border-radius: 20px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s;
}
.tab-btn:hover { color: #fff; border-color: var(--accent-primary); }
.tab-btn.active { 
    background: rgba(0, 242, 255, 0.1); color: var(--accent-primary); border-color: var(--accent-primary);
    box-shadow: 0 0 10px rgba(0, 242, 255, 0.2);
}
.viewport { flex: 1; position: relative; min-height: 0; }
.tab-content { display: none; height: 100%; animation: fadeIn 0.3s ease; }
.tab-content.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.grid-layout { display: grid; grid-template-columns: 350px 1fr 350px; gap: 20px; height: 100%; }
.grid-layout.single-col { grid-template-columns: 1fr; }
.panel {
    background: var(--glass-bg); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.05);
    border-radius: var(--border-radius); display: flex; flex-direction: column; padding: 15px; overflow: hidden;
}
h3 { margin: 0 0 15px 0; font-size: 0.8rem; letter-spacing: 1px; color: var(--accent-primary); text-transform: uppercase; display: flex; align-items: center; }
.scroll-box { flex: 1; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; }
.mini-list p { margin: 5px 0; padding: 8px; background: rgba(255,255,255,0.02); border-radius: 4px; }
.muted { color: var(--text-muted); font-style: italic; }
.pin-btn { cursor: pointer; float: right; opacity: 0.5; transition: opacity 0.2s; }
.pin-btn:hover { opacity: 1; color: var(--accent-secondary); }
.pin-btn.active { opacity: 1; color: var(--accent-secondary); }
.pipeline-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; }
.pipeline-section { display: flex; flex-direction: column; }
h4 { font-size: 0.7rem; color: var(--text-muted); margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px; }
.gallery-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; align-content: start; }
.model-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 0.75rem; }
.model-card.local { border-left: 3px solid var(--accent-primary); }
.model-card.cloud-free { border-left: 3px solid var(--accent-secondary); }
.model-card.cloudflare { border-left: 3px solid #f38020; }
.model-card h5 { margin: 0 0 5px 0; color: #fff; }
.model-card .badge { font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); text-transform: uppercase; }
.terminal-style { background: #000; border: 1px solid #333; padding: 15px; border-radius: 4px; color: #00ff00; }
.terminal-meta { font-size: 0.7rem; color: #888; border-bottom: 1px solid #222; margin-bottom: 10px; padding-bottom: 5px; }
.terminal-output pre { margin: 0; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; }
.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; margin-bottom: 10px; }
.switch { position: relative; display: inline-block; width: 40px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; }
.slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; }
input:checked + .slider { background-color: var(--accent-primary); }
input:checked + .slider:before { transform: translateX(20px); }
.slider.round { border-radius: 34px; } .slider.round:before { border-radius: 50%; }
footer { display: flex; justify-content: space-between; padding: 15px 20px; margin-top: 20px; background: var(--glass-bg); border-radius: var(--border-radius); font-size: 0.75rem; }
.health-grid { display: flex; justify-content: space-around; align-items: center; padding: 20px 0; gap: 40px; }
.health-gauge { display: flex; flex-direction: column; align-items: center; }
.gauge-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
.gauge-ring { position: relative; width: 120px; height: 120px; }
.gauge-ring svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.gauge-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 8; }
.gauge-fg { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 0.5s ease; }
.gauge-fg.cpu { stroke: var(--accent-primary); }
.gauge-fg.mem { stroke: var(--accent-secondary); }
.gauge-fg.disk { stroke: #f38020; }
.gauge-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.5rem; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
.context-preview-box { margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; max-height: 200px; overflow: hidden; }
.preview-code { margin: 0; padding: 10px; font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: var(--text-muted); white-space: pre-wrap; word-break: break-all; max-height: 150px; overflow-y: auto; }
.pinned-file-item { cursor: pointer; transition: background 0.2s; }
.pinned-file-item:hover { background: rgba(0,242,255,0.1); }
.pinned-file-item.active { border-left: 2px solid var(--accent-primary); }
.mt-20 { margin-top: 20px; }
.env-status-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; padding: 10px 0; }
.env-tag { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); }
.env-tag.active { border-color: rgba(0, 242, 255, 0.3); background: rgba(0, 242, 255, 0.05); }
.env-key { font-size: 0.7rem; color: #aaa; font-family: 'JetBrains Mono', monospace; }
.env-val { font-size: 0.75rem; color: var(--accent-primary); }
.env-indicator { width: 8px; height: 8px; border-radius: 50%; background: #444; }
.env-indicator.online { background: var(--accent-primary); box-shadow: 0 0 5px var(--accent-primary); }
`;

        const js = `
const wsHost = 'ws://localhost:${this.config.wsPort}';
const RELAY_URL = "wss://antigravity-bridge-relay.kristain33rs.workers.dev/bridge/1"; // Default Relay
const APP_ID = "1";

// Ternary Connection State
const CS = {
    DISCONNECTED: -1,
    CONNECTING: 1,
    CONNECTED_LOCAL: 0,
    CONNECTED_RELAY: 2
};
let connectionState = CS.DISCONNECTED;
let ws;
let retryCount = 0;

function updateConnectionUI(state) {
    const dot = document.getElementById('ws-status');
    const text = document.getElementById('ws-text');
    
    dot.className = 'status-dot'; // reset
    
    switch(state) {
        case CS.CONNECTED_LOCAL:
            dot.classList.add('online');
            text.innerText = 'Local Neural Link';
            break;
        case CS.CONNECTED_RELAY:
            dot.classList.add('relay');
            dot.style.backgroundColor = '#f38020'; // Cloudflare Orange
            text.innerText = 'Cloud Relay Active';
            break;
        case CS.CONNECTING:
            dot.classList.add('connecting');
            dot.style.backgroundColor = '#ffff00';
            text.innerText = 'Establishing Link...';
            break;
        case CS.DISCONNECTED:
        default:
            dot.classList.remove('online');
            dot.style.backgroundColor = '#ff0000';
            text.innerText = 'Link Severed';
            break;
    }
}

function connectLocal() {
    connectionState = CS.CONNECTING;
    updateConnectionUI(connectionState);
    
    ws = new WebSocket(wsHost);

    ws.onopen = () => {
        retryCount = 0;
        connectionState = CS.CONNECTED_LOCAL;
        updateConnectionUI(connectionState);
        ws.send(JSON.stringify({ type: 'control', command: 'requestState' }));
    };

    ws.onclose = () => {
        if (connectionState === CS.CONNECTED_LOCAL) {
            console.log("Local connection lost. Retrying...");
        }
        connectionState = CS.DISCONNECTED;
        updateConnectionUI(connectionState);
        // Exponential backoff for local, then failover to relay? 
        // For now, robust local retry then maybe relay manual toggle.
        setTimeout(connectLocal, Math.min(1000 * (2 ** retryCount++), 10000));
    };

    ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
    ws.onerror = (err) => console.error("Local WS Error:", err);
}

// Function to switch to Cloud Relay (User Triggered)
function connectRelay() {
   if (ws) ws.close();
   connectionState = CS.CONNECTING;
   updateConnectionUI(connectionState);

   const relayUrlWithRole = RELAY_URL.includes('?') ? \`\${RELAY_URL}&role=agent\` : \`\${RELAY_URL}?role=agent\`;
   ws = new WebSocket(relayUrlWithRole);
   
   ws.onopen = () => {
       connectionState = CS.CONNECTED_RELAY;
       updateConnectionUI(connectionState);
       ws.send(JSON.stringify({ type: 'system', data: \`Agent ID \${APP_ID} Dashboard Online\` }));
   };

   ws.onclose = () => {
       connectionState = CS.DISCONNECTED;
       updateConnectionUI(connectionState);
   };
   
   ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
}

function connect() {
    // Default to local
    connectLocal();
}

function handleMessage(msg) {
    switch(msg.type) {
        case 'intentExecuted': addIntent(msg.data); break;
        case 'commandExecuted': addLog(\`CMD: \${msg.data.command}\`, 'stdout'); break;
        case 'preview_log':
            const pathMatch = msg.data.match(/[a-zA-Z]:\\\\([^\\s]+)/);
            addLog(msg.data, 'stdout', pathMatch ? pathMatch[0] : null);
            break;
        case 'state': updateStateUI(msg.data); break;
    }
}

function toggleService(service, enabled) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'toggleService', data: { service, enabled } }));
}
function switchWorkspace(path) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'switchWorkspace', data: { path } }));
}
function togglePin(path) {
    if (ws && ws.readyState === 1) {
        const btn = document.querySelector(\`[data-path='\${path}']\`);
        const isPinned = btn ? btn.classList.contains('active') : false;
        ws.send(JSON.stringify({ type: 'control', command: isPinned ? 'unpinFile' : 'pinFile', data: { path } }));
    }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    };
});

function addLog(text, stream, path) {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.style.marginBottom = '5px'; entry.style.borderLeft = '2px solid var(--accent-secondary)'; entry.style.paddingLeft = '10px';
    let html = \`<span style="color:#888; font-size:0.7rem">\${new Date().toLocaleTimeString()}</span>\`;
    if (path) html += \` <span class="pin-btn" data-path="\${path}" onclick="togglePin('\${path}')">📍</span>\`;
    html += \`<br>\${text}\`;
    entry.innerHTML = html;
    container.prepend(entry);
}

function addIntent(data) {
    const list = document.getElementById('intent-list');
    const item = document.createElement('div');
    item.style.padding = '10px'; item.style.background = 'rgba(255,255,255,0.02)'; item.style.marginBottom = '10px';
    item.innerHTML = \`<strong>Q:</strong> \${data.query}<br><small>Model: \${data.selectedModel}</small>\`;
    list.prepend(item);
}

function updateStateUI(state) {
    const select = document.getElementById('workspace-select');
    if (select.value !== state.activeWorkspace) select.value = state.activeWorkspace;
    const pinnedList = document.getElementById('pinned-files-list');
    if (state.pinnedFiles && state.pinnedFiles.length > 0) {
        pinnedList.innerHTML = state.pinnedFiles.map(f => \`
            <p class="pinned-file-item" onclick="loadFilePreview('\${f}')">\${f.split(/[\\\\/]/).pop()} <span class="pin-btn active" onclick="event.stopPropagation(); togglePin('\${f}')">📍</span></p>
        \`).join('');
    } else pinnedList.innerHTML = '<p class="muted">No files pinned.</p>';

    // Store file previews if sent
    if (state.filePreview) {
        document.getElementById('preview-title').innerText = state.filePreview.name || 'File Preview';
        document.getElementById('preview-content').innerText = state.filePreview.content || 'Unable to load preview.';
    }

    document.querySelectorAll('.pin-btn').forEach(btn => {
        const path = btn.getAttribute('data-path');
        if (state.pinnedFiles.includes(path)) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if (state.modelInventory) {
        const gallery = document.getElementById('model-gallery');
        gallery.innerHTML = state.modelInventory.map(m => \`
            <div class="model-card \${m.type}">
                <h5>\${m.name}</h5>
                <span class="badge">\${m.type}</span>
                <p style="margin:5px 0 0 0; color:#888; font-size:0.65rem">\${m.capabilities.join(', ')}</p>
            </div>
        \`).join('');
    }

    if (state.terminalTelemetry) {
        document.getElementById('terminal-header').innerText = \`Process: \${state.terminalTelemetry.lastProcess} | Status: \${state.terminalTelemetry.status}\`;
        document.getElementById('terminal-content').innerText = state.terminalTelemetry.lastOutput;
    }
}

// Health Tab: Update gauges from state telemetry
function updateHealthGauges(state) {
    if (!state.systemHealth) return;
    const circumference = 2 * Math.PI * 45; // r=45
    
    const cpuPct = state.systemHealth.cpu || 0;
    const memPct = state.systemHealth.mem || 0;
    const diskPct = state.systemHealth.disk || 0;
    
    // Update gauge arcs (stroke-dasharray: filled unfilled)
    document.getElementById('cpu-gauge')?.setAttribute('stroke-dasharray', \`\${(cpuPct / 100) * circumference} \${circumference}\`);
    document.getElementById('mem-gauge')?.setAttribute('stroke-dasharray', \`\${(memPct / 100) * circumference} \${circumference}\`);
    document.getElementById('disk-gauge')?.setAttribute('stroke-dasharray', \`\${(diskPct / 100) * circumference} \${circumference}\`);
    
    // Update numeric labels
    const cpuEl = document.getElementById('cpu-pct');
    if (cpuEl) cpuEl.innerText = cpuPct.toFixed(0) + '%';
    const memEl = document.getElementById('mem-pct');
    if (memEl) memEl.innerText = memPct.toFixed(0) + '%';
    const diskEl = document.getElementById('disk-pct');
    if (diskEl) diskEl.innerText = diskPct.toFixed(0) + '%';
    
    // Update footer
    const cpuLoadEl = document.getElementById('cpu-load');
    if (cpuLoadEl) cpuLoadEl.innerText = cpuPct.toFixed(1) + '%';
    const memUsageEl = document.getElementById('mem-usage');
    if (memUsageEl) memUsageEl.innerText = memPct.toFixed(1) + '%';

    // Update Environment Status
    if (state.envStatus) {
        const envGrid = document.getElementById('env-status-grid');
        if (envGrid) {
            envGrid.innerHTML = state.envStatus.map(s => \`
                <div class="env-tag \${s.active ? 'active' : ''}">
                    <div style="display:flex; align-items:center; gap:10px">
                        <div class="env-indicator \${s.active ? 'online' : ''}"></div>
                        <span class="env-key">\${s.key}</span>
                    </div>
                    <span class="env-val">\${s.value}</span>
                </div>
            \`).join('');
        }
    }
}

// Load file preview via WebSocket request
function loadFilePreview(filePath) {
    document.getElementById('preview-title').innerText = filePath.split(/[\\\\/]/).pop();
    document.getElementById('preview-content').innerText = 'Loading preview...';
    
    // Request file content via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'requestFilePreview', path: filePath }));
    } else {
        document.getElementById('preview-content').innerText = 'WebSocket not connected.';
    }
}
connect();
`;

        fs.writeFileSync(join(this.dashboardDir, 'index.html'), html);
        fs.writeFileSync(join(this.dashboardDir, 'styles.css'), css);
        fs.writeFileSync(join(this.dashboardDir, 'main.js'), js);
    }
}
