
const wsHost = 'ws://localhost:8765';
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

   const relayUrlWithRole = RELAY_URL.includes('?') ? `${RELAY_URL}&role=agent` : `${RELAY_URL}?role=agent`;
   ws = new WebSocket(relayUrlWithRole);
   
   ws.onopen = () => {
       connectionState = CS.CONNECTED_RELAY;
       updateConnectionUI(connectionState);
       ws.send(JSON.stringify({ type: 'system', data: `Agent ID ${APP_ID} Dashboard Online` }));
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
        case 'commandExecuted': addLog(`CMD: ${msg.data.command}`, 'stdout'); break;
        case 'preview_log':
            const logText = typeof msg.data === 'string' ? msg.data : '';
            const pathMatch = logText.match(/[a-zA-Z]:\\([^\s]+)/);
            addLog(logText, 'stdout', pathMatch ? pathMatch[0] : null);
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
        const btn = document.querySelector(`[data-path='${path}']`);
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
        const tabEl = tabId ? document.getElementById(tabId) : null;
        if (tabEl) tabEl.classList.add('active');
    };
});

function addLog(text, stream, path) {
    const container = document.getElementById('log-container');
    const entry = document.createElement('div');
    entry.style.marginBottom = '5px'; entry.style.borderLeft = '2px solid var(--accent-secondary)'; entry.style.paddingLeft = '10px';
    let html = `<span style="color:#888; font-size:0.7rem">${new Date().toLocaleTimeString()}</span>`;
    if (path) html += ` <span class="pin-btn" data-path="${path}" onclick="togglePin('${path}')">📍</span>`;
    html += `<br>${text}`;
    entry.innerHTML = html;
    container.prepend(entry);
}

function addIntent(data) {
    const list = document.getElementById('intent-list');
    const item = document.createElement('div');
    item.style.padding = '10px'; item.style.background = 'rgba(255,255,255,0.02)'; item.style.marginBottom = '10px';
    item.innerHTML = `<strong>Q:</strong> ${data.query}<br><small>Model: ${data.selectedModel}</small>`;
    list.prepend(item);
}

function updateStateUI(state) {
    const select = document.getElementById('workspace-select');
    if (select.value !== state.activeWorkspace) select.value = state.activeWorkspace;
    const pinnedList = document.getElementById('pinned-files-list');
    if (state.pinnedFiles && state.pinnedFiles.length > 0) {
        pinnedList.innerHTML = state.pinnedFiles.map(f => `
            <p class="pinned-file-item" onclick="loadFilePreview('${f}')">${f.split(/[\\/]/).pop()} <span class="pin-btn active" onclick="event.stopPropagation(); togglePin('${f}')">📍</span></p>
        `).join('');
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
        gallery.innerHTML = state.modelInventory.map(m => `
            <div class="model-card ${m.type}">
                <h5>${m.name}</h5>
                <span class="badge">${m.type}</span>
                <p style="margin:5px 0 0 0; color:#888; font-size:0.65rem">${m.capabilities.join(', ')}</p>
            </div>
        `).join('');
    }

    if (state.terminalTelemetry) {
        document.getElementById('terminal-header').innerText = `Process: ${state.terminalTelemetry.lastProcess} | Status: ${state.terminalTelemetry.status}`;
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
    document.getElementById('cpu-gauge')?.setAttribute('stroke-dasharray', `${(cpuPct / 100) * circumference} ${circumference}`);
    document.getElementById('mem-gauge')?.setAttribute('stroke-dasharray', `${(memPct / 100) * circumference} ${circumference}`);
    document.getElementById('disk-gauge')?.setAttribute('stroke-dasharray', `${(diskPct / 100) * circumference} ${circumference}`);
    
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
            envGrid.innerHTML = state.envStatus.map(s => `
                <div class="env-tag ${s.active ? 'active' : ''}">
                    <div style="display:flex; align-items:center; gap:10px">
                        <div class="env-indicator ${s.active ? 'online' : ''}"></div>
                        <span class="env-key">${s.key}</span>
                    </div>
                    <span class="env-val">${s.value}</span>
                </div>
            `).join('');
        }
    }
}

// Load file preview via WebSocket request
function loadFilePreview(filePath) {
    document.getElementById('preview-title').innerText = filePath.split(/[\\/]/).pop();
    document.getElementById('preview-content').innerText = 'Loading preview...';
    
    // Request file content via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'requestFilePreview', path: filePath }));
    } else {
        document.getElementById('preview-content').innerText = 'WebSocket not connected.';
    }
}
connect();
