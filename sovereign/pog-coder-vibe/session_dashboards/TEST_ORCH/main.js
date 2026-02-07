
const wsHost = 'ws://localhost:8765';
let ws;

function connect() {
    ws = new WebSocket(wsHost);
    const dot = document.getElementById('ws-status');
    const text = document.getElementById('ws-text');

    ws.onopen = () => {
        dot.classList.add('online'); text.innerText = 'Connected';
        ws.send(JSON.stringify({ type: 'control', command: 'requestState' }));
    };
    ws.onclose = () => {
        dot.classList.remove('online'); text.innerText = 'Disconnected';
        setTimeout(connect, 3000);
    };
    ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
}

function handleMessage(msg) {
    switch(msg.type) {
        case 'intentExecuted': addIntent(msg.data); break;
        case 'commandExecuted': addLog(`CMD: ${msg.data.command}`, 'stdout'); break;
        case 'preview_log':
            const pathMatch = msg.data.match(/[a-zA-Z]:\\([^\s]+)/);
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
        document.getElementById(tabId).classList.add('active');
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
            <p>${f} <span class="pin-btn active" onclick="togglePin('${f}')">📍</span></p>
        `).join('');
    } else pinnedList.innerHTML = '<p class="muted">No files pinned.</p>';

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
connect();
