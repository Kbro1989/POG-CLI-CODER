import { BaseLimb } from './BaseLimb.js';
import type { Intent, Execution } from './NeuralLimb.js';
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
                handler: async () => {
                    const result = await this.activate();
                    if (result.ok) return { ok: true, value: `Dashboard activated: ${result.value.output}` };
                    return result;
                }
            }
        ]);
    }

    override async canHandle(intent: Intent): Promise<boolean> {
        const p = intent.prompt.toLowerCase();
        return p.includes('dashboard') || p.includes('show interface') || p.includes('ui');
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

            this.generateAssets();

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
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%2300f2ff'/><text x='50' y='65' font-size='50' text-anchor='middle' fill='%23050505'>⚡</text></svg>" type="image/svg+xml">
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
                <button class="tab-btn" data-tab="ai">Pipeline</button>
                <button class="tab-btn" data-tab="terminal">Terminal</button>
                <button class="tab-btn" data-tab="books" id="tab-books">Books</button>
                <button class="tab-btn" data-tab="storyboard" id="tab-storyboard">Storyboard</button>
                <button class="tab-btn" data-tab="media">Forge</button>
                <button class="tab-btn" data-tab="settings">Config</button>
            </nav>
            <div class="status-indicator">
                <button id="mic-btn" class="mic-btn" title="Speak">🎙️</button>
                <span id="ws-status" class="status-dot"></span>
                <span id="ws-text">Neural Link</span>
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
                        <h3><span class="icon">👁️</span> NEURAL VIEWER</h3>
                        <div id="viewer-canvas-container" class="canvas-box premium-loader">
                            <div class="cube-loader"><div class="cube cube1"></div><div class="cube cube2"></div><div class="cube cube3"></div><div class="cube cube4"></div></div>
                        </div>
                    </section>
                    <section class="panel side-panel">
                        <h3><span class="icon">🧠</span> RECENT INTENTS</h3>
                        <div id="intent-list" class="scroll-box"></div>
                    </section>
                </div>
            </div>

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

            <div id="terminal" class="tab-content"><section class="panel full-panel"><h3><span class="icon">💻</span> TERMINAL</h3><div id="terminal-view" class="scroll-box terminal-style"><pre id="terminal-content"></pre></div></section></div>
            <div id="settings" class="tab-content"><section class="panel settings-panel"><h3><span class="icon">⚙️</span> CONFIG</h3><div class="settings-grid"><div class="setting-item"><label>AUDIO FEEDBACK</label><label class="switch"><input type="checkbox" id="tts-enabled" onchange="toggleTTS(this.checked)"><span class="slider round"></span></label></div></div></section></div>
        </main>
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
}
body { margin: 0; padding: 0; background: var(--bg-dark); color: var(--text-main); font-family: 'Inter', sans-serif; overflow: hidden; }
.vibe-theme { background: radial-gradient(circle at top right, #1a0033, #050505 60%), radial-gradient(circle at bottom left, #001a1a, #050505 60%); height: 100vh; }
.glass-container { display: flex; flex-direction: column; height: 100vh; padding: 15px; box-sizing: border-box; }
header { display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; background: var(--glass-bg); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--border-radius); margin-bottom: 15px; }
.tab-nav { display: flex; gap: 8px; }
.tab-btn { background: transparent; border: 1px solid rgba(255,255,255,0.05); color: var(--text-muted); padding: 6px 14px; border-radius: 18px; cursor: pointer; font-size: 0.75rem; transition: 0.2s; }
.tab-btn.active { background: rgba(0, 242, 255, 0.1); color: var(--accent-primary); border-color: var(--accent-primary); }
.viewport { flex: 1; min-height: 0; }
.tab-content { display: none; height: 100%; animation: fadeIn 0.4s ease; }
.tab-content.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
.grid-layout { display: grid; grid-template-columns: 320px 1fr 320px; gap: 15px; height: 100%; }
.panel { background: var(--glass-bg); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--border-radius); display: flex; flex-direction: column; padding: 12px; overflow: hidden; }
h3 { margin: 0 0 12px 0; font-size: 0.75rem; color: var(--accent-primary); letter-spacing: 1px; }
.scroll-box { flex: 1; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; scrollbar-width: thin; }
.model-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; margin-bottom: 8px; transition: 0.2s; cursor: pointer; }
.model-card:hover { border-color: var(--accent-primary); background: rgba(0, 242, 255, 0.03); }
.action-btn { background: rgba(0, 242, 255, 0.08); border: 1px solid var(--accent-primary); color: #fff; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; border: 1px solid var(--accent-primary); }
.action-btn:hover { background: var(--accent-primary); color: #000; }
.full-width { width: 100%; }
.reader-view { padding: 30px; font-family: 'Inter', serif; line-height: 1.8; font-size: 1.1rem; color: #bbb; white-space: pre-wrap; }
.style-tag { background: rgba(0, 242, 255, 0.15); color: var(--accent-primary); padding: 5px 10px; border-radius: 4px; border: 1px solid var(--accent-primary); font-size: 0.8rem; margin: 5px 0; }
.storyboard-grid { display: flex; flex-direction: column; gap: 15px; padding: 10px; }
.beat-card { background: rgba(255,255,255,0.03); border-left: 4px solid var(--accent-primary); padding: 20px; border-radius: 0 8px 8px 0; }
.beat-card h4 { margin: 0 0 10px 0; color: var(--accent-primary); }
.visual-prompt { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px; font-style: italic; color: var(--accent-secondary); border: 1px dashed rgba(255,0,234,0.3); margin-top: 10px; }
.mic-btn { background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; transition: 0.3s; }
.mic-btn.active { border-color: red; color: red; box-shadow: 0 0 15px rgba(255,0,0,0.3); }
`;

        const js = `
let ws;
let allBooks = [];
let currentBook = null;
let ttsEnabled = false;
let narrating = false;

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'books') requestBooks();
    };
});

function requestBooks() { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'requestBooks' })); }

function filterBooks(q) {
    const f = allBooks.filter(b => b.title.toLowerCase().includes(q.toLowerCase()) || b.author.toLowerCase().includes(q.toLowerCase()));
    renderBooks(f);
}

function renderBooks(books) {
    const list = document.getElementById('bookshelf-list');
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
    document.getElementById('selected-style-name').innerText = currentBook.author;
    document.getElementById('selected-style-name').dataset.bookId = currentBook.id;
    document.querySelector('[data-tab="storyboard"]').click();
}

function forgeStoryboard() {
    const bookId = parseInt(document.getElementById('selected-style-name').dataset.bookId);
    const premise = document.getElementById('story-premise').value;
    if (!bookId || !premise) return alert("Select a book and enter a premise!");
    
    addLog(\`Forging storyboard with \${currentBook.author} style...\`, "stdout");
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'forge_storyboard', data: { bookId, premise } }));
}

function connect() {
    ws = new WebSocket(\`ws://\${window.location.host}\`);
    ws.onopen = () => addLog("Neural Link OK", "stdout");
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
        else if (msg.type === 'intentExecuted') { addLog(msg.data.output, "stdout"); if (msg.data.data && msg.data.data.type === 'transcription_job') addLearningLog(\`Learning from transcription: \${msg.data.data.fileName}\`); }
    };
    ws.onclose = () => setTimeout(connect, 2000);
}

function renderStoryboard(beats) {
    const container = document.getElementById('storyboard-gallery');
    container.innerHTML = beats.map(b => \`
        <div class="beat-card">
            <h4>\${b.title || 'Scene Beat'}</h4>
            <p>\${b.beat || b.narrative}</p>
            <div class="visual-prompt">Forge Prompt: \${b.visual || b.prompt || 'Atmospheric scene'}</div>
        </div>
    \`).join('');
    addLearningLog("Saved storyboard to VectorDB learning buffer.");
}

function renderStyle(s) {
    document.getElementById('book-style-profile').innerHTML = Object.entries(s).map(([k,v]) => \`<div><strong>\${k}:</strong> \${v}</div>\`).join('');
}

function addLog(t, s) {
    const l = document.getElementById('log-container');
    const d = document.createElement('div');
    d.innerHTML = \`<span style="color:#444">\${new Date().toLocaleTimeString()}</span> \${t}\`;
    l.prepend(d);
}

function addLearningLog(t) {
    const l = document.getElementById('learning-logs');
    const d = document.createElement('div'); d.className = 'model-card';
    d.innerHTML = \`<small>NEW LESSON</small><br>\${t}\`; 
    l.prepend(d);
}

function toggleNarration() { narrating = !narrating; document.getElementById('narrate-btn').classList.toggle('active', narrating); if (!narrating) window.speechSynthesis.cancel(); else speakText(document.getElementById('reader-content').innerText); }
function speakText(t) { if (!ttsEnabled && !narrating) return; const u = new SpeechSynthesisUtterance(t.substring(0, 500)); window.speechSynthesis.speak(u); }
function toggleTTS(e) { ttsEnabled = e; }
function switchWorkspace(p) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'switchWorkspace', data: { path: p } })); }
function closeReader() { document.getElementById('reader-content').innerHTML = '<div class="reader-placeholder">Select a book.</div>'; currentBook = null; }
function forgeMedia() { const p = document.getElementById('media-prompt').value; const t = document.getElementById('media-target').value; if (ws) ws.send(JSON.stringify({ type: 'control', command: 'media_forge_request', data: { prompt: p, targetType: t } })); }

connect();
`;

        fs.writeFileSync(join(this.dashboardDir, 'index.html'), html);
        fs.writeFileSync(join(this.dashboardDir, 'styles.css'), css);
        fs.writeFileSync(join(this.dashboardDir, 'main.js'), js);
    }
}
