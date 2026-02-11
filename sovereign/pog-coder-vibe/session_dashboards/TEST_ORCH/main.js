
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
    list.innerHTML = books.map(b => `
        <div class="model-card" onclick="readBook(${b.id})">
            <strong>${b.title}</strong><br>
            <small style="color:var(--accent-primary)">${b.author}</small>
        </div>
    `).join('') || '<p class="muted">Empty library.</p>';
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
    
    addLog(`Forging storyboard with ${currentBook.author} style...`, "stdout");
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'forge_storyboard', data: { bookId, premise } }));
}

function promptAudiobookImport() {
    const fileName = prompt("Enter audio filename in D:\\pog-gutenberg\\audio\\:");
    if (fileName && ws && ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'control', command: 'transcribeAudiobook', data: { fileName } }));
        addLog(`Initiated transcription for: ${fileName}`, "stdout");
    }
}

function connect() {
    ws = new WebSocket(`ws://${window.location.hostname}:8765`);
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
            document.getElementById('reader-title').innerText = `📖 ${currentBook.title}`;
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
    if (cpuGauge) cpuGauge.setAttribute('stroke-dasharray', `${(cpu / 100) * circumference} ${circumference}`);
    document.getElementById('cpu-pct').innerText = cpu.toFixed(0) + '%';
    
    // Update Radial Orbs in Footer
    const cpuPath = document.getElementById('path-cpu');
    if (cpuPath) cpuPath.setAttribute('stroke-dasharray', `${(cpu / 100) * 100}, 100`);
    const cpuFooter = document.getElementById('cpu-load-footer');
    if (cpuFooter) cpuFooter.innerText = cpu.toFixed(0);

    const memGauge = document.getElementById('mem-gauge');
    if (memGauge) memGauge.setAttribute('stroke-dasharray', `${(mem / 100) * circumference} ${circumference}`);
    document.getElementById('mem-pct').innerText = mem.toFixed(0) + '%';
    
    const memPath = document.getElementById('path-mem');
    if (memPath) memPath.setAttribute('stroke-dasharray', `${(mem / 100) * 100}, 100`);
    const memFooter = document.getElementById('mem-usage-footer');
    if (memFooter) memFooter.innerText = mem.toFixed(0);

    const diskGauge = document.getElementById('disk-gauge');
    if (diskGauge) diskGauge.setAttribute('stroke-dasharray', `${(disk / 100) * circumference} ${circumference}`);
    document.getElementById('disk-pct').innerText = disk.toFixed(0) + '%';
    
    const diskPath = document.getElementById('path-disk');
    if (diskPath) diskPath.setAttribute('stroke-dasharray', `${(disk / 100) * 100}, 100`);
    const diskFooter = document.getElementById('disk-val-footer');
    if (diskFooter) diskFooter.innerText = disk.toFixed(0);

    const latencyGauge = document.getElementById('latency-gauge');
    if (latencyGauge) latencyGauge.setAttribute('stroke-dasharray', `${(Math.min(latency, 2000) / 2000) * circumference} ${circumference}`);
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
        return `
            <div class="model-card">
                <div style="display:flex;justify-content:space-between">
                    <strong>${id.toUpperCase()}</strong>
                    <span style="color:${status === 'OK' || status === 'READY' ? '#00ff00' : '#ff4444'}">${status}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderModelGallery(models) {
    const container = document.getElementById('model-gallery');
    if (!container) return;
    container.innerHTML = models.map(m => `
        <div class="model-card ${m.type}">
            <strong>${m.name}</strong><br>
            <small style="color:var(--accent-primary)">${m.type.toUpperCase()}</small>
            <div style="font-size:0.6rem;color:#888;margin-top:5px">${m.capabilities.join(', ')}</div>
        </div>
    `).join('');
}

function updatePinnedFiles(files) {
    const list = document.getElementById('pinned-files-list');
    if (!list) return;
    list.innerHTML = files.map(f => `
        <div class="model-card" onclick="loadFilePreview('${f}')">
            <span>${f.split(/[\\/]/).pop()}</span>
        </div>
    `).join('') || '<p class="muted">No files pinned.</p>';
}

function updateSettingsGrid(services) {
    const grid = document.getElementById('settings-grid');
    if (!grid) return;
    // We only update if length changes or we can map them, 
    // but for precision we re-render to ensure toggles stay in sync with config.
    grid.innerHTML = services.map(s => `
        <div class="setting-item">
            <label>${s.toUpperCase()}</label>
            <label class="switch">
                <input type="checkbox" checked onchange="toggleService('${s}', this.checked)">
                <span class="slider round"></span>
            </label>
        </div>
    `).join('');
}

function renderLimbMatrix(limbs) {
    const container = document.getElementById('limb-matrix');
    if (!container) return;
    container.innerHTML = limbs.map(l => {
        const tools = l.tools || [];
        return `
            <div class="limb-card">
                <div class="limb-header">
                    <span class="limb-id">${l.id.toUpperCase()}</span>
                    <span class="limb-type">${l.type}</span>
                </div>
                <div class="limb-desc">${l.capabilities.slice(0, 3).join(', ')}...</div>
                <div class="limb-tools">
                    ${tools.map(t => `
                        <button class="tool-btn" title="${t.description}" onclick="invokeTool('${l.id}', '${t.name}')">
                            ${t.name}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function invokeTool(limbId, toolName) {
    addLog(`Invoking tool: ${toolName} on ${limbId}...`, "stdout");
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
        el.innerText = `HEX: ${hex.name} (${hex.binary})`;
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
            
            return `
                <div class="${cls}">
                    <div class="yao-label" title="${line.content}">${line.title}</div>
                </div>
            `;
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
        
        return `<div class="${cls}" title="${m.text}">${m.type || 'Lesson'}: ${m.text.substring(0, 30)}...</div>`;
    }).join('');
}

function renderStoryboard(beats) {
    const container = document.getElementById('storyboard-gallery');
    if (!container) return;
    container.innerHTML = beats.map(b => `
        <div class="beat-card">
            <h4>${b.title || 'Scene Beat'}</h4>
            <p>${b.beat || b.narrative}</p>
            <div class="visual-prompt">Forge Prompt: ${b.visual || b.prompt || 'Atmospheric scene'}</div>
        </div>
    `).join('');
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
    container.innerHTML = entries.map(([name, val]) => `
        <div class="heatmap-row">
            <span class="heatmap-label" title="${name}">${name}</span>
            <div class="heatmap-bar-bg">
                <div class="heatmap-bar-fg" style="width: ${(val / max) * 100}%"></div>
            </div>
            <span class="heatmap-val">${val}</span>
        </div>
    `).join('');
}

function renderStyle(s) {
    const el = document.getElementById('book-style-profile');
    if (el) el.innerHTML = Object.entries(s).map(([k,v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('');
}

function addLog(t, s) {
    const l = document.getElementById('log-container');
    if (!l) return;
    const d = document.createElement('div');
    d.className = `log-line ${(s || 'stdout').toLowerCase()}`;
    
    let content = t;
    if (typeof t === 'string' && t.startsWith('{') && t.endsWith('}')) {
        try {
            const json = JSON.parse(t);
            content = `<pre class="log-line json">${JSON.stringify(json, null, 2)}</pre>`;
        } catch(e) {}
    }

    d.innerHTML = `<span style="color:#444">${new Date().toLocaleTimeString()}</span> ${content}`;
    l.prepend(d);
    
    // Pulse matrix on activity
    pulseMatrix();
}

function addIntent(data) {
    const list = document.getElementById('intent-list');
    if (!list) return;
    const item = document.createElement('div');
    item.className = 'model-card';
    item.innerHTML = `<strong>Q:</strong> ${data.query}<br><small>Model: ${data.selectedModel}</small>`;
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
        
        return `<div class="${cls}" title="${m.text}">${m.type || 'Lesson'}: ${m.text.substring(0, 30)}...</div>`;
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
        node.id = `node-${l.id}`;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
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
