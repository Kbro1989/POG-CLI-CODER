import { BaseLimb } from './BaseLimb.js';
import { z } from 'zod';
import type { Intent, Execution, TernaryDecision } from './NeuralLimb.js';
import type { Result, VibeConfig } from '../../core/models.js';
import { PreviewServer } from '../../core/PreviewServer.js';
import * as fs from 'fs';
import { join } from 'path';

/**
 * DashboardLimb - Session-specific QOL Control Plane
 * Generates and serves a "Straight Up & Brilliant" HTML UI.
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
        this.generateAssets();
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
                schema: z.object({}),
                handler: async () => {
                    const result = await this.activate();
                    if (result.ok) return { ok: true, value: `Dashboard activated: ${result.value.output}` };
                    return result;
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<TernaryDecision> {
        const p = intent.prompt.toLowerCase();

        // +1: Explicit dashboard keywords = optimal
        if (p.includes('dashboard') || p.includes('show interface')) return 1;

        // 0: General UI keywords = maybe
        if (p.includes('ui') || p.includes('interface')) return 0;

        return -1;
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
            this.logger.info({ dashboardDir: this.dashboardDir }, 'Activating dashboard substrate');

            if (!fs.existsSync(this.dashboardDir)) {
                this.logger.debug('Dashboard directory missing, creating...');
                fs.mkdirSync(this.dashboardDir, { recursive: true });
            }

            // Always regenerate assets on activation to ensure they exist
            this.generateAssets();

            const basePort = this.config.wsPort + 1;
            let targetPort = basePort;

            // 1. Detect Conflict & Verify Identity
            const isActive = await this.previewServer.isPortActive(basePort);
            if (isActive) {
                const isPog = await this.previewServer.isPogService(basePort);
                if (isPog) {
                    this.logger.info({ port: basePort }, 'POG Dashboard detected on port, reclaiming for fresh start');
                    await this.previewServer.killProcessByPort(basePort);
                    targetPort = basePort;
                } else {
                    this.logger.warn({ port: basePort }, 'Non-POG service detected on default dashboard port, finding fallback');
                    targetPort = await this.previewServer.findAvailablePort(basePort + 1);
                }
            }

            const result = await this.previewServer.startPreview(
                'POG-DASHBOARD',
                this.dashboardDir,
                `npx -y http-server . -p ${targetPort}`,
                targetPort
            );

            if (!result.ok) {
                this.logger.error({ error: result.error }, 'Failed to start dashboard server');
                return { ok: false, error: result.error };
            }

            return {
                ok: true,
                value: {
                    output: `Dashboard activated: ${result.value.url}`,
                    data: { url: result.value.url, port: targetPort }
                }
            };
        } catch (error) {
            this.logger.error({ error }, 'Critical failure during dashboard activation');
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
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2300f2ff'/><text x='50' y='65' font-size='50' text-anchor='middle' fill='%23050505'>⚡</text></svg>" type="image/svg+xml">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
</head>
<body class="vibe-theme">
    <div id="bloom-substrate-container" style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;opacity:0.4;">
        <canvas id="bloom-substrate"></canvas>
    </div>
    <div class="glass-container" style="position:relative;z-index:2;">
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
                <button class="tab-btn" data-tab="limbs">Limb Matrix</button>
                <button class="tab-btn" data-tab="terminal">Terminal</button>
                <button class="tab-btn" data-tab="health">Health</button>
                <button class="tab-btn" data-tab="books" id="tab-books">Books</button>
                <button class="tab-btn" data-tab="storyboard" id="tab-storyboard">Storyboard</button>
                <button class="tab-btn" data-tab="media">Forge</button>
                <button class="tab-btn" data-tab="settings">Config</button>
            </nav>
            <div class="status-indicator">
                <div id="sovereign-narrative" class="sovereign-narrative">The substrate is quiet...</div>
                <button id="mic-btn" class="mic-btn" title="Speak">🎙️</button>
                <span id="ws-status" class="status-dot"></span>
                <span id="ws-text">Neural Link</span>
            </div>
        </header>

        <main class="viewport">
            <!-- DASHBOARD TAB -->
            <div id="dashboard" class="tab-content active">
                <div class="grid-layout">
                    <section class="panel side-panel">
                        <h3><span class="icon">📜</span> LIVE AUDIT</h3>
                        <div id="log-container" class="scroll-box"></div>
                    </section>
                    <section class="panel main-panel">
                        <h3><span class="icon">👁️</span> NEURAL VIEWER</h3>
                        <div id="viewer-canvas-container" class="canvas-box premium-loader">
                            <div id="connectivity-matrix" class="matrix-canvas"></div>
                        </div>
                        <div id="memory-pulse" class="memory-pulse-container">
                            <div class="memory-label">HEXAGRAM METABOLISM</div>
                            <div id="hexagram-viz" class="hexagram-viz-box"></div>
                            <div id="active-hexagram-info" class="hexagram-badge">Unknown Archetype</div>
                            <div class="memory-label mt-10">MEMORY PULSE</div>
                            <div id="active-memories-list" class="memory-bubbles"></div>
                        </div>
                    </section>
                    <section class="panel side-panel">
                        <h3><span class="icon">🧠</span> RECENT INTENTS</h3>
                        <div id="intent-list" class="scroll-box"></div>
                        <h3 class="mt-20"><span class="icon">🔥</span> NEURAL HEATMAP</h3>
                        <div id="neural-heatmap" class="heatmap-container">
                            <p class="muted">No activity data...</p>
                        </div>
                    </section>
                </div>
            </div>

            <!-- AI PIPELINE TAB -->
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

            <!-- LIMB MATRIX TAB -->
            <div id="limbs" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel full-panel">
                        <h3><span class="icon">🧬</span> INTERACTIVE LIMB MATRIX</h3>
                        <div id="limb-matrix" class="limb-grid scroll-box">
                            <p class="muted">Introspecting limb substrate...</p>
                        </div>
                    </section>
                </div>
            </div>

            <!-- TERMINAL TAB -->
            <div id="terminal" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel full-panel">
                        <h3><span class="icon">💻</span> SYSTEM TERMINAL</h3>
                        <div id="terminal-view" class="scroll-box terminal-style">
                            <div id="terminal-header" class="terminal-meta">Process: PowerShell Extension | Status: <span id="term-status-val">Active</span></div>
                            <div id="terminal-body" class="terminal-output">
                                <pre id="terminal-content">Initializing cognitive terminal link...</pre>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <!-- HEALTH TAB -->
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
                            <div class="health-gauge">
                                <div class="gauge-label">NEURAL LATENCY</div>
                                <div class="gauge-ring">
                                    <svg viewBox="0 0 100 100">
                                        <circle class="gauge-bg" cx="50" cy="50" r="45"/>
                                        <circle id="latency-gauge" class="gauge-fg latency" cx="50" cy="50" r="45" stroke-dasharray="0 283"/>
                                    </svg>
                                    <div id="latency-val" class="gauge-value">--</div>
                                </div>
                            </div>
                        </div>
                        <div id="health-history" class="scroll-box mt-20">
                            <h4>Service Stability Registry</h4>
                            <div id="cluster-health" class="mini-list health-events">
                                <p class="muted">Detecting limb status...</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <!-- BOOKS TAB -->
            <div id="books" class="tab-content">
                <div class="grid-layout">
                    <section class="panel side-panel">
                        <h3><span class="icon">📚</span> BOOKSHELF</h3>
                        <div class="search-box"><input type="text" id="book-search" placeholder="Filter library..." oninput="filterBooks(this.value)"></div>
                        <div id="bookshelf-list" class="scroll-box mini-list mt-10"><p class="muted">Loading D:\\pog-gutenberg...</p></div>
                        <div class="sidebar-actions mt-10">
                            <button onclick="promptAudiobookImport()" class="action-btn cyan full-width">🎙️ Import Audiobook</button>
                        </div>
                    </section>
                    <section class="panel main-panel">
                        <div class="reader-header">
                            <h3 id="reader-title"><span class="icon">📖</span> READER</h3>
                            <div class="reader-actions">
                                <button id="narrate-btn" onclick="toggleNarration()" class="icon-btn">🎧</button>
                                <button onclick="triggerStoryboardFromBook()" class="icon-btn" title="Draft Storyboard">🎬</button>
                                <button onclick="closeReader()" class="close-btn">×</button>
                            </div>
                        </div>
                        <div id="reader-content" class="scroll-box reader-view"><div class="reader-placeholder">Select a book.</div></div>
                    </section>
                    <section class="panel side-panel">
                        <h3><span class="icon">📝</span> STYLE BRAIN</h3>
                        <div id="book-style-profile" class="scroll-box style-list"><p class="muted">No learning data.</p></div>
                    </section>
                </div>
            </div>

            <!-- STORYBOARD TAB -->
            <div id="storyboard" class="tab-content">
                <div class="grid-layout">
                    <section class="panel side-panel">
                        <h3><span class="icon">📽️</span> DIRECTORS CUT</h3>
                        <div class="forge-controls">
                            <label>STORY PREMISE</label>
                            <textarea id="story-premise" placeholder="Enter your story idea..."></textarea>
                            <label>STYLE INSPIRATION</label>
                            <div id="selected-style-name" class="style-tag">None Selected</div>
                            <button onclick="forgeStoryboard()" class="action-btn cyan full-width mt-10">GENERATE BEATS</button>
                        </div>
                    </section>
                    <section class="panel main-panel">
                        <h3><span class="icon">🎞️</span> ACTIVE STORYBOARD</h3>
                        <div id="storyboard-gallery" class="storyboard-grid scroll-box">
                            <p class="muted">Start a new storyboard to see beats.</p>
                        </div>
                    </section>
                    <section class="panel side-panel">
                        <h3><span class="icon">🧬</span> AGENT LEARNING</h3>
                        <div id="learning-logs" class="scroll-box mini-list">
                            <p class="muted">Waiting for creative events...</p>
                        </div>
                    </section>
                </div>
            </div>

            <!-- MEDIA FORGE TAB -->
            <div id="media" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel forge-panel">
                        <h3><span class="icon">🎨</span> MEDIA FORGE</h3>
                        <div class="forge-controls horizontal">
                            <textarea id="media-prompt" placeholder="Forge something brilliant..."></textarea>
                            <div class="forge-actions">
                                <select id="media-target"><option value="image">Image</option><option value="speech">Speech</option><option value="model">RSMV</option></select>
                                <button onclick="forgeMedia()" class="action-btn cyan">Forge</button>
                            </div>
                        </div>
                        <div id="media-library" class="scroll-box gallery-view mt-10"></div>
                    </section>
                </div>
            </div>

            <!-- CONFIG TAB -->
            <div id="settings" class="tab-content">
                <div class="grid-layout single-col">
                    <section class="panel settings-panel">
                        <h3><span class="icon">⚙️</span> CORE CONFIG</h3>
                        <div class="settings-grid" id="settings-grid">
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
            <div class="orb-telemetry">
                <div class="orb-unit" title="CPU Phase">
                    <svg viewBox="0 0 36 36"><path class="orb-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path id="path-cpu" class="orb-fg cpu" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg>
                    <span class="orb-val" id="cpu-load-footer">--</span>
                </div>
                <div class="orb-unit" title="Memory Flux">
                    <svg viewBox="0 0 36 36"><path class="orb-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path id="path-mem" class="orb-fg mem" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg>
                    <span class="orb-val" id="mem-usage-footer">--</span>
                </div>
                <div class="orb-unit" title="Disk Substrate">
                    <svg viewBox="0 0 36 36"><path class="orb-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/><path id="path-disk" class="orb-fg disk" stroke-dasharray="0, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/></svg>
                    <span class="orb-val" id="disk-val-footer">--</span>
                </div>
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
    --glass-bg: rgba(15, 15, 15, 0.85);
    --text-main: #e0e0e0;
    --text-muted: #666;
    --border-radius: 12px;
    --pulse-intensity: 0;
}
body { margin: 0; padding: 0; background: var(--bg-dark); color: var(--text-main); font-family: 'Inter', sans-serif; overflow: hidden; transition: 0.3s; }
body.pulse { background: radial-gradient(circle at center, rgba(0, 242, 255, calc(var(--pulse-intensity) * 0.05)), var(--bg-dark)); }
.vibe-theme { background: radial-gradient(circle at top right, #1a0033, #050505 60%), radial-gradient(circle at bottom left, #001a1a, #050505 60%); height: 100vh; }
.glass-container { display: flex; flex-direction: column; height: 100vh; padding: 15px; box-sizing: border-box; }
header { display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; background: var(--glass-bg); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--border-radius); margin-bottom: 15px; }
.tab-nav { display: flex; gap: 8px; }
.tab-btn { background: transparent; border: 1px solid rgba(255,255,255,0.05); color: var(--text-muted); padding: 6px 14px; border-radius: 18px; cursor: pointer; font-size: 0.75rem; transition: 0.2s; }
.tab-btn.active { background: rgba(0, 242, 255, 0.1); color: var(--accent-primary); border-color: var(--accent-primary); box-shadow: 0 0 10px rgba(0,242,255,0.2); }
.viewport { flex: 1; min-height: 0; position: relative; }
.tab-content { display: none; height: 100%; animation: fadeIn 0.4s ease; }
.tab-content.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.grid-layout { display: grid; grid-template-columns: 320px 1fr 320px; gap: 15px; height: 100%; }
.grid-layout.single-col { grid-template-columns: 1fr; }
.panel { background: var(--glass-bg); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--border-radius); display: flex; flex-direction: column; padding: 12px; overflow: hidden; }
h3 { margin: 0 0 12px 0; font-size: 0.75rem; color: var(--accent-primary); letter-spacing: 1px; text-transform: uppercase; }
.scroll-box { flex: 1; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; scrollbar-width: thin; }
.list-view { display: flex; flex-direction: column; gap: 5px; }
.model-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; transition: 0.2s; cursor: pointer; position: relative; overflow: hidden; }
.model-card:hover { border-color: var(--accent-primary); background: rgba(0, 242, 255, 0.03); }
.model-card.local { border-left: 3px solid var(--accent-primary); }
.model-card.cloud { border-left: 3px solid var(--accent-secondary); }
.model-card.cloudflare { border-left: 3px solid #f38020; }
.action-btn { background: rgba(0, 242, 255, 0.08); border: 1px solid var(--accent-primary); color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; }
.action-btn:hover { background: var(--accent-primary); color: #000; }
.full-width { width: 100%; }
.reader-view { padding: 30px; font-family: 'Inter', serif; line-height: 1.8; font-size: 1.1rem; color: #bbb; white-space: pre-wrap; }
.style-tag { background: rgba(0, 242, 255, 0.15); color: var(--accent-primary); padding: 5px 10px; border-radius: 4px; border: 1px solid var(--accent-primary); font-size: 0.8rem; margin: 5px 0; }
.storyboard-grid { display: flex; flex-direction: column; gap: 15px; padding: 10px; }
.beat-card { background: rgba(255,255,255,0.03); border-left: 4px solid var(--accent-primary); padding: 20px; border-radius: 0 8px 8px 0; }
.beat-card h4 { margin: 0 0 10px 0; color: var(--accent-primary); }
.visual-prompt { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-style: italic; color: var(--accent-secondary); border: 1px dashed rgba(255,0,234,0.3); margin-top: 10px; }
.mic-btn { background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; transition: 0.3s; margin-right: 10px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.mic-btn.active { border-color: red; color: red; box-shadow: 0 0 15px rgba(255,0,0,0.3); }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: #444; display: inline-block; margin-right: 5px; }
.status-dot.online { background: #00ff00; box-shadow: 0 0 10px #00ff00; }
.status-dot.offline { background: #ff4444; box-shadow: 0 0 10px #ff4444; }
.muted { color: var(--text-muted); text-align: center; margin-top: 20px; font-style: italic; }

/* HEALTH GAUGES */
.health-grid { display: flex; justify-content: space-around; align-items: center; padding: 20px 0; gap: 20px; }
.health-gauge { display: flex; flex-direction: column; align-items: center; }
.gauge-label { font-size: 0.65rem; color: var(--text-muted); letter-spacing: 1px; margin-bottom: 8px; }
.gauge-ring { position: relative; width: 100px; height: 100px; }
.gauge-ring svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.gauge-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 8; }
.gauge-fg { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 0.5s ease; }
.gauge-fg.cpu { stroke: var(--accent-primary); }
.gauge-fg.mem { stroke: var(--accent-secondary); }
.gauge-fg.disk { stroke: #f38020; }
.gauge-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.2rem; font-weight: 800; }

/* PIPELINE TAB */
.pipeline-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; height: 100%; }
.pipeline-section { display: flex; flex-direction: column; }
.gallery-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.context-preview-box { margin-top: 15px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px; }
.preview-code { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; color: #888; white-space: pre-wrap; max-height: 200px; overflow-y: auto; margin: 0; }

/* SETTINGS TAB */
.settings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 10px; }
.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); border-radius: 8px; }
.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 34px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: var(--accent-primary); }
input:checked + .slider:before { transform: translateX(16px); }

/* RADIAL TELEMETRY ORBS */
.orb-telemetry { display: flex; gap: 20px; align-items: center; }
.orb-unit { position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
.orb-unit svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.orb-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 3; }
.orb-fg { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1); }
.orb-fg.cpu { stroke: var(--accent-primary); filter: drop-shadow(0 0 5px var(--accent-primary)); }
.orb-fg.mem { stroke: var(--accent-secondary); filter: drop-shadow(0 0 5px var(--accent-secondary)); }
.orb-fg.disk { stroke: #00ff00; filter: drop-shadow(0 0 5px #00ff00); }
.orb-val { font-size: 0.45rem; font-weight: 800; color: var(--text-main); position: relative; z-index: 1; pointer-events: none; }
#bloom-substrate { width: 100%; height: 100%; display: block; }

/* LIMB MATRIX */
.limb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; padding: 10px; }
.limb-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 15px; display: flex; flex-direction: column; transition: 0.3s; }
.limb-card:hover { border-color: var(--accent-primary); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,242,255,0.1); }
.limb-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.limb-id { font-weight: 800; color: #fff; font-size: 0.9rem; }
.limb-type { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: rgba(0,242,255,0.1); color: var(--accent-primary); border: 1px solid var(--accent-primary); }
.limb-desc { font-size: 0.75rem; color: #aaa; margin-bottom: 12px; line-height: 1.4; }
.limb-tools { display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); pt: 10px; margin-top: 10px; }
.tool-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #ccc; padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; transition: 0.2s; }
.tool-btn:hover { background: var(--accent-primary); color: #000; border-color: var(--accent-primary); }
.tool-btn:active { transform: scale(0.95); }

.model-tag span { color: var(--accent-primary); font-weight: bold; }

/* MEMORY PULSE */
.memory-pulse-container { margin-top: 15px; padding: 12px; border-top: 1px solid rgba(255,255,255,0.05); position: relative; }
.memory-label { font-size: 0.6rem; color: var(--text-muted); letter-spacing: 2px; margin-bottom: 8px; font-weight: 800; }
.memory-bubbles { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.memory-bubble { font-size: 0.7rem; background: rgba(0,242,255,0.05); border: 1px solid rgba(0,242,255,0.15); color: #88eeff; padding: 4px 10px; border-radius: 12px; animation: pulseGlow 2s infinite alternate; }
@keyframes pulseGlow { from { box-shadow: 0 0 5px rgba(0,242,255,0.1); border-color: rgba(0,242,255,0.1); } to { box-shadow: 0 0 12px rgba(0,242,255,0.3); border-color: var(--accent-primary); } }
.hexagram-badge { font-size: 0.75rem; color: var(--accent-secondary); font-weight: 800; border: 1px solid var(--accent-secondary); padding: 4px 8px; border-radius: 4px; display: inline-block; background: rgba(255,0,234,0.05); }

/* CONNECTIVITY MATRIX */
.matrix-canvas { width: 100%; height: 100%; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at center, rgba(0, 242, 255, 0.05) 0%, transparent 70%); }
.matrix-node { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: var(--accent-primary); box-shadow: 0 0 8px var(--accent-primary); opacity: 0.3; transition: 0.5s; }
.matrix-node.active { opacity: 1; transform: scale(1.5); box-shadow: 0 0 15px var(--accent-primary); }
.matrix-line { position: absolute; background: linear-gradient(90deg, transparent, var(--accent-primary), transparent); height: 1px; opacity: 0.1; transform-origin: left center; }
.gauge-fg.latency { stroke: #ffcc00; }
.memory-bubble.strategy { border-color: var(--accent-secondary); color: var(--accent-secondary); background: rgba(255, 0, 234, 0.05); }
.memory-bubble.code { border-color: var(--accent-primary); color: var(--accent-primary); background: rgba(0, 242, 255, 0.05); }
.sovereign-narrative { font-size: 0.7rem; font-style: italic; color: var(--accent-primary); max-width: 300px; text-align: right; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; margin-right: 15px; opacity: 0.8; transition: 0.5s; }
.sovereign-narrative:hover { white-space: normal; position: absolute; top: 50px; right: 20px; background: var(--glass-bg); padding: 10px; border: 1px solid var(--accent-primary); border-radius: 8px; z-index: 100; opacity: 1; }
.status-indicator { display: flex; align-items: center; }
.log-line.stdout { border-left: 2px solid var(--accent-primary); padding-left: 5px; margin-bottom: 2px; }
.log-line.stderr { border-left: 2px solid #ff4444; padding-left: 5px; color: #ff8888; margin-bottom: 2px; }
.log-line.json { color: #88ccff; font-family: 'JetBrains Mono', monospace; }

/* HEXAGRAM VIZ */
.hexagram-viz-box { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; perspective: 500px; }
.yao-line { height: 6px; width: 120px; position: relative; transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.yao-line.yang { background: linear-gradient(90deg, transparent, var(--accent-primary), transparent); border-radius: 3px; }
.yao-line.yin { display: flex; justify-content: space-between; background: transparent; }
.yao-line.yin::before, .yao-line.yin::after { content: ""; height: 100%; width: 55px; background: linear-gradient(90deg, transparent, var(--accent-secondary), transparent); border-radius: 3px; }
.yao-line.moving-yang { animation: moveYang 2s infinite alternate; }
.yao-line.moving-yin { animation: moveYin 2s infinite alternate; }
@keyframes moveYang { from { filter: brightness(1) drop-shadow(0 0 2px var(--accent-primary)); } to { filter: brightness(1.5) drop-shadow(0 0 10px var(--accent-primary)); } }
@keyframes moveYin { from { filter: brightness(1) drop-shadow(0 0 2px var(--accent-secondary)); } to { filter: brightness(1.5) drop-shadow(0 0 10px var(--accent-secondary)); } }
.yao-label { position: absolute; left: -140px; top: -5px; width: 130px; text-align: right; font-size: 0.6rem; color: #444; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mt-10 { margin-top: 10px; }
.mt-20 { margin-top: 20px; }

/* NEURAL HEATMAP */
.heatmap-container { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.03); }
.heatmap-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; }
.heatmap-bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; margin: 0 10px; overflow: hidden; }
.heatmap-bar-fg { height: 100%; background: var(--accent-primary); box-shadow: 0 0 5px var(--accent-primary); transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
.heatmap-label { color: var(--text-muted); width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.heatmap-val { color: var(--accent-primary); font-weight: 800; width: 20px; text-align: right; }
`;

        const js = `
let ws;
let allBooks = [];
let currentBook = null;
let ttsEnabled = false;
let narrating = false;

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        const targetId = btn.dataset.tab;
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        targetEl.classList.add('active');
        if (targetId === 'books') requestBooks();
    };
});

function requestBooks() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'requestBooks' })); }

function filterBooks(q) {
    const f = allBooks.filter(b => b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase()));
    renderBooks(f);
}

function renderBooks(books) {
    const list = document.getElementById('bookshelf-list');
    if (!list) return;
    list.innerHTML = books.map(b => \`
        <div class="model-card" onclick="readBook(\${b.id})">
            <strong>\${b.title}</strong><br>
            <small style="color:var(--accent-primary)">\${b.author}</small>
        </div>
    \`).join('') || '<p class="muted">Empty library.</p>';
}

function readBook(id) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'readBook', data: { bookId: id } }));
}

function triggerStoryboardFromBook() {
    if (!currentBook) return;
    const styleName = document.getElementById('selected-style-name');
    if (styleName) {
        styleName.innerText = currentBook.author;
        styleName.dataset.bookId = currentBook.id;
    }
    document.querySelector('[data-tab="storyboard"]').click();
}

function forgeStoryboard() {
    const styleName = document.getElementById('selected-style-name');
    const bookId = styleName ? parseInt(styleName.dataset.bookId) : null;
    const premise = document.getElementById('story-premise').value;
    if (!bookId || !premise) return alert("Select a book and enter a premise!");
    
    addLog(\`Forging storyboard with \${currentBook.author} style...\`, "stdout");
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'forge_storyboard', data: { bookId, premise } }));
}

function promptAudiobookImport() {
    const fileName = prompt("Enter audio filename in D:\\\\pog-gutenberg\\\\audio\\\\:");
    if (fileName && ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'control', command: 'transcribeAudiobook', data: { fileName } }));
        addLog(\`Initiated transcription for: \${fileName}\`, "stdout");
    }
}

function connect() {
    ws = new WebSocket(\`ws://\${window.location.hostname}:${this.config.wsPort}\`);
    ws.onopen = () => {
        addLog("Neural Link OK", "stdout");
        const dot = document.getElementById('ws-status');
        if (dot) dot.classList.add('online');
        document.getElementById('ws-text').innerText = 'Online';
        ws.send(JSON.stringify({ type: 'control', command: 'requestState' }));
    };
    ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'books') { allBooks = msg.data; renderBooks(allBooks); }
        else if (msg.type === 'bookContent') {
            currentBook = msg.data.book;
            document.getElementById('reader-content').innerText = msg.data.content;
            document.getElementById('reader-title').innerText = \`📖 \${currentBook.title}\`;
            if (msg.data.book.styleProfile) renderStyle(msg.data.book.styleProfile);
        }
        else if (msg.type === 'storyboard') { renderStoryboard(msg.data.storyboard); }
        else if (msg.type === 'intentExecuted') { 
            addLog(msg.data.output, "stdout"); 
            addIntent(msg.data);
            window.lastNeuralLatency = msg.data.executionTime;
            pulseMatrix();
        }
        else if (msg.type === 'state') {
            updateStateUI(msg.data);
        }
        else if (msg.type === 'pulse') {
            triggerPulseUI(msg.data);
        }
    };
    ws.onclose = () => {
        const dot = document.getElementById('ws-status');
        if (dot) dot.classList.remove('online');
        document.getElementById('ws-text').innerText = 'Disconnected';
        setTimeout(connect, 2000);
    };
}

function updateStateUI(state) {
    if (state.envStatus) renderLimbHealth(state.envStatus);
    if (state.limbs) renderLimbHealth(state.limbs); // Limbs are also part of status
    if (state.systemHealth) updateHealthGauges(state.systemHealth);
    if (state.modelInventory) renderModelGallery(state.modelInventory);
    if (state.pinnedFiles) updatePinnedFiles(state.pinnedFiles);
    if (state.enabledServices) updateSettingsGrid(state.enabledServices);
    if (state.limbs) {
        renderLimbMatrix(state.limbs);
        if (!document.querySelector('.matrix-node')) initMatrix(state.limbs);
    }
    if (state.activeHexagram) updateHexagramUI(state.activeHexagram, state.hexagramLines);
    if (state.activeMemories) updateMemoryPulse(state.activeMemories);
    if (state.neuralHeatmap) renderNeuralHeatmap(state.neuralHeatmap);
    
    if (state.sovereignVoice) {
        const narr = document.getElementById('sovereign-narrative');
        if (narr) narr.innerText = state.sovereignVoice;
    }

    // Update footer statuses
    if (document.getElementById('gemini-status')) {
        const gem = state.envStatus?.find(e => e.service === 'gemini');
        document.getElementById('gemini-status').innerText = gem ? gem.status : 'IDLE';
    }
}

function updateHealthGauges(metrics) {
    const circumference = 2 * Math.PI * 45;
    const orbCircum = 2 * Math.PI * 15.9155; // For footer orbs
    
    const cpu = metrics.cpu || 0;
    const mem = metrics.mem || 0;
    const disk = metrics.disk || 0;
    const latency = metrics.latency || window.lastNeuralLatency || 0;

    const cpuGauge = document.getElementById('cpu-gauge');
    if (cpuGauge) cpuGauge.setAttribute('stroke-dasharray', \`\${(cpu / 100) * circumference} \${circumference}\`);
    document.getElementById('cpu-pct').innerText = cpu.toFixed(0) + '%';
    
    // Update Radial Orbs in Footer
    const cpuPath = document.getElementById('path-cpu');
    if (cpuPath) cpuPath.setAttribute('stroke-dasharray', \`\${(cpu / 100) * 100}, 100\`);
    const cpuFooter = document.getElementById('cpu-load-footer');
    if (cpuFooter) cpuFooter.innerText = cpu.toFixed(0);

    const memGauge = document.getElementById('mem-gauge');
    if (memGauge) memGauge.setAttribute('stroke-dasharray', \`\${(mem / 100) * circumference} \${circumference}\`);
    document.getElementById('mem-pct').innerText = mem.toFixed(0) + '%';
    
    const memPath = document.getElementById('path-mem');
    if (memPath) memPath.setAttribute('stroke-dasharray', \`\${(mem / 100) * 100}, 100\`);
    const memFooter = document.getElementById('mem-usage-footer');
    if (memFooter) memFooter.innerText = mem.toFixed(0);

    const diskGauge = document.getElementById('disk-gauge');
    if (diskGauge) diskGauge.setAttribute('stroke-dasharray', \`\${(disk / 100) * circumference} \${circumference}\`);
    document.getElementById('disk-pct').innerText = disk.toFixed(0) + '%';
    
    const diskPath = document.getElementById('path-disk');
    if (diskPath) diskPath.setAttribute('stroke-dasharray', \`\${(disk / 100) * 100}, 100\`);
    const diskFooter = document.getElementById('disk-val-footer');
    if (diskFooter) diskFooter.innerText = disk.toFixed(0);

    const latencyGauge = document.getElementById('latency-gauge');
    if (latencyGauge) latencyGauge.setAttribute('stroke-dasharray', \`\${(Math.min(latency, 2000) / 2000) * circumference} \${circumference}\`);
    document.getElementById('latency-val').innerText = (latency / 1000).toFixed(1) + 's';

    // Boost bloom based on combined intensity
    if (bloom) bloom.setIntensity((cpu + mem) / 200);
}

/* SOVEREIGN BLOOM - PARTICLE SUBSTRATE */
class SovereignBloom {
    constructor() {
        this.canvas = document.getElementById('bloom-substrate');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.intensity = 0.2;
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.animate();
    }
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    setIntensity(v) { this.intensity = Math.max(0.1, Math.min(1.0, v)); }
    spawn() {
        if (this.particles.length > 300) return;
        this.particles.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 1,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            life: 0.8 + Math.random() * 0.2,
            color: Math.random() > 0.5 ? '#00f2ff' : '#ff00ea'
        });
    }
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (Math.random() < this.intensity / 2) this.spawn();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * (1 + this.intensity * 3);
            p.y += p.vy * (1 + this.intensity * 3);
            p.life -= 0.002;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }
            
            this.ctx.globalAlpha = p.life * 0.4;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Subtle aura for moving yang/yin
            if (this.intensity > 0.6) {
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = p.color;
            } else {
                this.ctx.shadowBlur = 0;
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}
let bloom = null;
window.addEventListener('DOMContentLoaded', () => { bloom = new SovereignBloom(); });

function renderLimbHealth(limbs) {
    const container = document.getElementById('cluster-health');
    if (!container) return;
    container.innerHTML = limbs.map(l => {
        const id = l.id || l.service;
        const status = l.status || (l.state === 'READY' ? 'OK' : 'ERROR');
        return \`
            <div class="model-card">
                <div style="display:flex;justify-content:space-between">
                    <strong>\${id.toUpperCase()}</strong>
                    <span style="color:\${status === 'OK' || status === 'READY' ? '#00ff00' : '#ff4444'}">\${status}</span>
                </div>
            </div>
        \`;
    }).join('');
}

function renderModelGallery(models) {
    const container = document.getElementById('model-gallery');
    if (!container) return;
    container.innerHTML = models.map(m => \`
        <div class="model-card \${m.type}">
            <strong>\${m.name}</strong><br>
            <small style="color:var(--accent-primary)">\${m.type.toUpperCase()}</small>
            <div style="font-size:0.6rem;color:#888;margin-top:5px">\${m.capabilities.join(', ')}</div>
        </div>
    \`).join('');
}

function updatePinnedFiles(files) {
    const list = document.getElementById('pinned-files-list');
    if (!list) return;
    list.innerHTML = files.map(f => \`
        <div class="model-card" onclick="loadFilePreview('\${f}')">
            <span>\${f.split(/[\\\\/]/).pop()}</span>
        </div>
    \`).join('') || '<p class="muted">No files pinned.</p>';
}

function updateSettingsGrid(services) {
    const grid = document.getElementById('settings-grid');
    if (!grid) return;
    // We only update if length changes or we can map them, 
    // but for precision we re-render to ensure toggles stay in sync with config.
    grid.innerHTML = services.map(s => \`
        <div class="setting-item">
            <label>\${s.toUpperCase()}</label>
            <label class="switch">
                <input type="checkbox" checked onchange="toggleService('\${s}', this.checked)">
                <span class="slider round"></span>
            </label>
        </div>
    \`).join('');
}

function renderLimbMatrix(limbs) {
    const container = document.getElementById('limb-matrix');
    if (!container) return;
    container.innerHTML = limbs.map(l => {
        const tools = l.tools || [];
        return \`
            <div class="limb-card">
                <div class="limb-header">
                    <span class="limb-id">\${l.id.toUpperCase()}</span>
                    <span class="limb-type">\${l.type}</span>
                </div>
                <div class="limb-desc">\${l.capabilities.slice(0, 3).join(', ')}...</div>
                <div class="limb-tools">
                    \${tools.map(t => \`
                        <button class="tool-btn" title="\${t.description}" onclick="invokeTool('\${l.id}', '\${t.name}')">
                            \${t.name}
                        </button>
                    \`).join('')}
                </div>
            </div>
        \`;
    }).join('');
}

function invokeTool(limbId, toolName) {
    addLog(\`Invoking tool: \${toolName} on \${limbId}...\`, "stdout");
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'control', command: 'invoke_limb_tool', data: { limbId, toolName } }));
    }
}

function toggleService(service, enabled) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'toggleService', data: { service, enabled } }));
}

function updateHexagramUI(hex, lines) {
    const el = document.getElementById('active-hexagram-info');
    if (el) {
        el.innerText = \`HEX: \${hex.name} (\${hex.binary})\`;
        el.title = hex.strategy;
    }
    
    const viz = document.getElementById('hexagram-viz');
    if (viz && lines) {
        viz.innerHTML = lines.map((line, i) => {
            const state = line.state; // 0=OldYang, 1=YoungYin, 2=YoungYang, 3=OldYin
            let cls = 'yao-line';
            if (state === 0 || state === 2) cls += ' yang';
            else cls += ' yin';
            
            if (state === 0) cls += ' moving-yang';
            if (state === 3) cls += ' moving-yin';
            
            return \`
                <div class="\${cls}">
                    <div class="yao-label" title="\${line.content}">\${line.title}</div>
                </div>
            \`;
        }).reverse().join(''); // Bottom-to-top order in UI
    }
}

function updateMemoryPulse(memories) {
    const container = document.getElementById('active-memories-list');
    if (!container) return;
    if (memories.length === 0) {
        container.innerHTML = '<span style="color:#444;font-size:0.7rem">No historical context matched.</span>';
        return;
    }
    container.innerHTML = memories.map(m => {
        const type = (m.type || 'lesson').toLowerCase();
        let cls = 'memory-bubble';
        if (type.includes('code') || type.includes('script')) cls += ' code';
        else if (type.includes('strategy') || type.includes('workflow')) cls += ' strategy';
        else if (type.includes('lore') || type.includes('fact')) cls += ' lore';
        
        return \`<div class="\${cls}" title="\${m.text}">\${m.type || 'Lesson'}: \${m.text.substring(0, 30)}...</div>\`;
    }).join('');
}

function renderStoryboard(beats) {
    const container = document.getElementById('storyboard-gallery');
    if (!container) return;
    container.innerHTML = beats.map(b => \`
        <div class="beat-card">
            <h4>\${b.title || 'Scene Beat'}</h4>
            <p>\${b.beat || b.narrative}</p>
            <div class="visual-prompt">Forge Prompt: \${b.visual || b.prompt || 'Atmospheric scene'}</div>
        </div>
    \`).join('');
}

function renderNeuralHeatmap(data) {
    const container = document.getElementById('neural-heatmap');
    if (!container) return;
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
        container.innerHTML = '<p class="muted">Waiting for activity...</p>';
        return;
    }
    const max = Math.max(...entries.map(e => e[1]));
    container.innerHTML = entries.map(([name, val]) => \`
        <div class="heatmap-row">
            <span class="heatmap-label" title="\${name}">\${name}</span>
            <div class="heatmap-bar-bg">
                <div class="heatmap-bar-fg" style="width: \${(val / max) * 100}%"></div>
            </div>
            <span class="heatmap-val">\${val}</span>
        </div>
    \`).join('');
}

function renderStyle(s) {
    const el = document.getElementById('book-style-profile');
    if (el) el.innerHTML = Object.entries(s).map(([k,v]) => \`<div><strong>\${k}:</strong> \${v}</div>\`).join('');
}

function addLog(t, s) {
    const l = document.getElementById('log-container');
    if (!l) return;
    const d = document.createElement('div');
    d.className = \`log-line \${(s || 'stdout').toLowerCase()}\`;
    
    let content = t;
    if (typeof t === 'string' && t.startsWith('{') && t.endsWith('}')) {
        try {
            const json = JSON.parse(t);
            content = \`<pre class="log-line json">\${JSON.stringify(json, null, 2)}</pre>\`;
        } catch(e) {}
    }

    d.innerHTML = \`<span style="color:#444">\${new Date().toLocaleTimeString()}</span> \${content}\`;
    l.prepend(d);
    
    // Pulse matrix on activity
    pulseMatrix();
}

function addIntent(data) {
    const list = document.getElementById('intent-list');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'model-card';
    item.innerHTML = \`<strong>Q:</strong> \${data.query}<br><small>Model: \${data.selectedModel}</small>\`;
    list.prepend(item);
}

function toggleNarration() { 
    narrating = !narrating; 
    const btn = document.getElementById('narrate-btn');
    if (btn) btn.classList.toggle('active', narrating);
    if (!narrating) window.speechSynthesis.cancel(); 
    else speakText(document.getElementById('reader-content').innerText); 
}

function speakText(t) { 
    if (!ttsEnabled && !narrating) return; 
    const u = new SpeechSynthesisUtterance(t.substring(0, 500)); 
    window.speechSynthesis.speak(u); 
}

function toggleTTS(e) { ttsEnabled = e; }

function switchWorkspace(p) { 
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'control', command: 'switchWorkspace', data: { path: p } })); 
}

function closeReader() { 
    const el = document.getElementById('reader-content');
    if (el) el.innerHTML = '<div class="reader-placeholder">Select a book.</div>'; 
    currentBook = null; 
}

function forgeMedia() { 
    const promptEl = document.getElementById('media-prompt');
    const targetEl = document.getElementById('media-target');
    const p = promptEl ? promptEl.value : ''; 
    const t = targetEl ? targetEl.value : 'image'; 
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'control', command: 'media_forge_request', data: { prompt: p, targetType: t } })); 
}

function updateMemoryPulse(memories) {
    const container = document.getElementById('active-memories-list');
    if (!container) return;
    if (memories.length === 0) {
        container.innerHTML = '<span style="color:#444;font-size:0.7rem">No historical context matched.</span>';
        return;
    }
    container.innerHTML = memories.map(m => {
        const type = (m.type || 'lesson').toLowerCase();
        let cls = 'memory-bubble';
        if (type.includes('code') || type.includes('script')) cls += ' code';
        else if (type.includes('strategy') || type.includes('workflow')) cls += ' strategy';
        else if (type.includes('lore') || type.includes('fact')) cls += ' lore';
        
        return \`<div class="\${cls}" title="\${m.text}">\${m.type || 'Lesson'}: \${m.text.substring(0, 30)}...</div>\`;
    }).join('');
}

function initMatrix(limbs) {
    const container = document.getElementById('connectivity-matrix');
    if (!container) return;
    container.innerHTML = '';
    const nodeCount = limbs.length || 5;
    const centerX = container.offsetWidth / 2;
    const centerY = container.offsetHeight / 2;
    const radius = 60;

    limbs.forEach((l, i) => {
        const angle = (i / nodeCount) * Math.PI * 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const node = document.createElement('div');
        node.className = 'matrix-node';
        node.id = \`node-\${l.id}\`;
        node.style.left = \`\${x}px\`;
        node.style.top = \`\${y}px\`;
        node.title = l.id;
        container.appendChild(node);
    });
}

function pulseMatrix() {
    const nodes = document.querySelectorAll('.matrix-node');
    if (nodes.length === 0) return;
    const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
    randomNode.classList.add('active');
    setTimeout(() => randomNode.classList.remove('active'), 1000);
}

function triggerPulseUI(data) {
    document.documentElement.style.setProperty('--pulse-intensity', data.intensity);
    document.body.classList.add('pulse');
    
    if (data.spark) {
         const logo = document.querySelector('.logo span');
         if (logo) {
             logo.style.color = 'var(--accent-secondary)';
             setTimeout(() => logo.style.color = 'var(--accent-primary)', 500);
         }
    }
    
    updateHealthGauges(data.health);
    setTimeout(() => document.body.classList.remove('pulse'), 500);
}

connect();
`;

        try {
            if (!fs.existsSync(this.dashboardDir)) {
                fs.mkdirSync(this.dashboardDir, { recursive: true });
            }
            fs.writeFileSync(join(this.dashboardDir, 'index.html'), html);
            fs.writeFileSync(join(this.dashboardDir, 'styles.css'), css);
            fs.writeFileSync(join(this.dashboardDir, 'main.js'), js);
            this.logger.debug('Dashboard assets written to disk successfully');
        } catch (err) {
            this.logger.error({ err }, 'Failed to write dashboard assets to disk substrate');
        }
    }
}
