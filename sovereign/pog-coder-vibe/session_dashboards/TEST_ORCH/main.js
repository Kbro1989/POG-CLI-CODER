
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
    document.getElementById('selected-style-name').innerText = currentBook.author;
    document.getElementById('selected-style-name').dataset.bookId = currentBook.id;
    document.querySelector('[data-tab="storyboard"]').click();
}

function forgeStoryboard() {
    const bookId = parseInt(document.getElementById('selected-style-name').dataset.bookId);
    const premise = document.getElementById('story-premise').value;
    if (!bookId || !premise) return alert("Select a book and enter a premise!");
    
    addLog(`Forging storyboard with ${currentBook.author} style...`, "stdout");
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'forge_storyboard', data: { bookId, premise } }));
}

function connect() {
    ws = new WebSocket(`ws://${window.location.host}`);
    ws.onopen = () => addLog("Neural Link OK", "stdout");
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
        else if (msg.type === 'intentExecuted') { addLog(msg.data.output, "stdout"); if (msg.data.data && msg.data.data.type === 'transcription_job') addLearningLog(`Learning from transcription: ${msg.data.data.fileName}`); }
    };
    ws.onclose = () => setTimeout(connect, 2000);
}

function renderStoryboard(beats) {
    const container = document.getElementById('storyboard-gallery');
    container.innerHTML = beats.map(b => `
        <div class="beat-card">
            <h4>${b.title || 'Scene Beat'}</h4>
            <p>${b.beat || b.narrative}</p>
            <div class="visual-prompt">Forge Prompt: ${b.visual || b.prompt || 'Atmospheric scene'}</div>
        </div>
    `).join('');
    addLearningLog("Saved storyboard to VectorDB learning buffer.");
}

function renderStyle(s) {
    document.getElementById('book-style-profile').innerHTML = Object.entries(s).map(([k,v]) => `<div><strong>${k}:</strong> ${v}</div>`).join('');
}

function addLog(t, s) {
    const l = document.getElementById('log-container');
    const d = document.createElement('div');
    d.innerHTML = `<span style="color:#444">${new Date().toLocaleTimeString()}</span> ${t}`;
    l.prepend(d);
}

function addLearningLog(t) {
    const l = document.getElementById('learning-logs');
    const d = document.createElement('div'); d.className = 'model-card';
    d.innerHTML = `<small>NEW LESSON</small><br>${t}`; 
    l.prepend(d);
}

function toggleNarration() { narrating = !narrating; document.getElementById('narrate-btn').classList.toggle('active', narrating); if (!narrating) window.speechSynthesis.cancel(); else speakText(document.getElementById('reader-content').innerText); }
function speakText(t) { if (!ttsEnabled && !narrating) return; const u = new SpeechSynthesisUtterance(t.substring(0, 500)); window.speechSynthesis.speak(u); }
function toggleTTS(e) { ttsEnabled = e; }
function switchWorkspace(p) { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'control', command: 'switchWorkspace', data: { path: p } })); }
function closeReader() { document.getElementById('reader-content').innerHTML = '<div class="reader-placeholder">Select a book.</div>'; currentBook = null; }
function forgeMedia() { const p = document.getElementById('media-prompt').value; const t = document.getElementById('media-target').value; if (ws) ws.send(JSON.stringify({ type: 'control', command: 'media_forge_request', data: { prompt: p, targetType: t } })); }

connect();
