/**
 * RSC Zero-Cost Router — ES Module Format (Single File)
 * 
 * All Durable Object classes and worker logic in one file.
 * CJS dependencies are lazy-loaded inside methods to avoid
 * top-level require() crashes in the Workers runtime.
 * 
 * Handles:
 * 1. Geo-routing to Durable Object Shards
 * 2. Asset serving with fallback (R2 -> KV)
 * 3. AI Gateway interception
 * 4. RSC Game Server (via RSCServerDO)
 * 5. Player Sessions (via PlayerDO)
 */

// ========================================
// DURABLE OBJECT: RSCServerDO
// ========================================

export class RSCServerDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = new Map();
        this.server = null;
        this.sessionCounter = 0;
        this.lastAutoSave = Date.now();
        this._auth = null;
        console.log('RSCServerDO initialized. Env keys:', Object.keys(env));
    }

    _getAuth() {
        if (!this._auth) {
            const { AuthService } = require('./durable-objects/auth.js');
            this._auth = new AuthService(this.env);
        }
        return this._auth;
    }

    async fetch(request) {
        try {
            const url = new URL(request.url);
            const upgradeHeader = request.headers.get('Upgrade');

            if (url.pathname === '/status' || url.pathname.endsWith('/status')) {
                return new Response(JSON.stringify({
                    players: this.sessions.size,
                    npcs: this.server?.world?.npcs?.length || 0,
                    ticks: this.server?.world?.tickCounter || 0,
                    serverInitialized: !!this.server,
                    status: 'Online',
                    envKeys: Object.keys(this.env || {})
                }), { headers: { 'Content-Type': 'application/json' } });
            }

            if (url.pathname === '/health' || url.pathname.endsWith('/health')) {
                return new Response('RSCServerDO v4 Online', { status: 200 });
            }

            if (url.pathname === '/debug/logs' || url.pathname.endsWith('/debug/logs')) {
                const list = await this.env.KV_BINDING.list({ prefix: 'debug_' });
                const logs = {};
                for (const key of list.keys) {
                    logs[key.name] = await this.env.KV_BINDING.get(key.name);
                }
                return new Response(JSON.stringify(logs, null, 2), { headers: { 'Content-Type': 'application/json' } });
            }

            if (upgradeHeader !== 'websocket') {
                return new Response('Expected WebSocket connection', { status: 426, headers: { 'Upgrade': 'websocket' } });
            }

            const [client, server] = Object.values(new WebSocketPair());
            await this.handleSession(server);

            const requestedProtocol = request.headers.get('Sec-WebSocket-Protocol');
            const responseHeaders = {};
            if (requestedProtocol) {
                responseHeaders['Sec-WebSocket-Protocol'] = requestedProtocol.split(',')[0].trim();
            }

            return new Response(null, {
                status: 101,
                webSocket: client,
                headers: responseHeaders
            });
        } catch (err) {
            return new Response(`Durable Object Error: ${err.message}\n${err.stack}`, { status: 500 });
        }
    }

    async handleSession(webSocket) {
        if (!this.server) {
            await this.initializeServer();
        }

        webSocket.accept();
        const sessionId = `session-${++this.sessionCounter}-${Date.now()}`;
        const session = {
            socket: webSocket,
            id: sessionId,
            connected: true,
            authenticated: false,
            username: null,
            playerData: null
        };

        this.sessions.set(sessionId, session);
        console.log(`[DO] New session connected: ${sessionId}`);
        this.env.KV_BINDING.put(`debug_sess_start_${sessionId}`, `Started`).catch(() => { });

        const socketBridge = this.createSocketBridge(sessionId, webSocket);
        const auth = this._getAuth();

        webSocket.addEventListener('message', async (event) => {
            if (!session.authenticated && typeof event.data === 'string') {
                try {
                    const jsonMsg = JSON.parse(event.data);
                    if (jsonMsg.type === 'register') {
                        await this._handleRegister(sessionId, jsonMsg, auth);
                        return;
                    }
                    if (jsonMsg.type === 'login') {
                        const success = await this._handleLogin(sessionId, jsonMsg, auth);
                        if (success) {
                            session.authenticated = true;
                            await this.server.handleAuthenticatedConnection(
                                socketBridge,
                                session.username,
                                session.playerData
                            );
                        }
                        return;
                    }
                } catch (e) { }
            }

            if (session.authenticated) {
                if (typeof event.data === 'string') {
                    try {
                        const jsonMsg = JSON.parse(event.data);
                        if (jsonMsg.type === 'logout') {
                            await this._handleLogout(sessionId, auth);
                            return;
                        }
                    } catch (e) { }
                }

                const { Buffer } = require('node:buffer');
                let buffer;
                if (typeof event.data === 'string') {
                    buffer = Buffer.from(event.data, 'utf8');
                } else if (event.data instanceof ArrayBuffer) {
                    buffer = Buffer.from(event.data);
                } else {
                    buffer = Buffer.from(event.data);
                }
                socketBridge.emit('data', buffer);
            }
        });

        webSocket.addEventListener('close', async () => {
            console.log(`[DO] Session closed: ${sessionId}`);
            this.sessions.delete(sessionId);
            socketBridge.emit('close', false);
            if (session.username && session.playerData) {
                try {
                    await auth.savePlayerData(session.username, session.playerData);
                } catch (e) { console.error('Save Error:', e); }
            }
        });

        webSocket.addEventListener('error', (error) => {
            console.error('[DO] WebSocket error:', error);
            this.sessions.delete(sessionId);
            socketBridge.emit('error', error);
        });
    }

    async _handleRegister(sessionId, { username, password }, auth) {
        try {
            const result = await auth.createUser(username, password);
            const session = this.sessions.get(sessionId);
            if (session) session.socket.send(JSON.stringify({ type: 'register_success', username: result.username }));
        } catch (error) {
            const session = this.sessions.get(sessionId);
            if (session) session.socket.send(JSON.stringify({ type: 'register_failure', reason: error.message }));
        }
    }

    async _handleLogin(sessionId, { username, password }, auth) {
        try {
            const { playerData } = await auth.login(username, password);
            const session = this.sessions.get(sessionId);
            if (!session) return false;
            session.username = username;
            session.playerData = playerData;
            session.socket.send(JSON.stringify({ type: 'login_success', username, playerData }));
            return true;
        } catch (error) {
            const session = this.sessions.get(sessionId);
            if (session) session.socket.send(JSON.stringify({ type: 'login_failure', reason: error.message }));
            return false;
        }
    }

    async _handleLogout(sessionId, auth) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.username) return;
        try {
            await auth.savePlayerData(session.username, session.playerData);
            session.socket.send(JSON.stringify({ type: 'logout_success' }));
            session.authenticated = false;
        } catch (error) {
            console.error(`[DO] Logout error:`, error);
        }
    }

    async initializeServer() {
        console.log('[DO] Initializing RSC Server...');

        // Lazy-load CJS dependencies
        const { Buffer } = require('node:buffer');
        const Server = require('./rsc-server/src/server.js');
        const land63 = require('./rsc-server/node_modules/@2003scape/rsc-landscape/land63.jag');
        const maps63 = require('./rsc-server/node_modules/@2003scape/rsc-landscape/maps63.jag');
        const landmem63 = require('./rsc-server/node_modules/@2003scape/rsc-landscape/land63.mem');
        const mapsmem63 = require('./rsc-server/node_modules/@2003scape/rsc-landscape/maps63.mem');

        const config = {
            worldID: 1,
            version: 204,
            members: true,
            experienceRate: 4,
            tcpPort: null,
            websocketPort: null,
            landscapeData: {
                landMsg: Buffer.from(land63),
                mapsJag: Buffer.from(maps63),
                landMem: Buffer.from(landmem63),
                mapsMem: Buffer.from(mapsmem63)
            }
        };

        try {
            this.server = new Server(config, this.env);
            await this.server.init();
            console.log('[DO] RSC Server initialized successfully');
            console.log('[DO] Starting tick loop via alarm...');
            await this.state.storage.setAlarm(Date.now() + 100);
        } catch (err) {
            const msg = `INIT_ERROR: ${err.message}\n${err.stack}`;
            await this.env.KV_BINDING.put('debug_error_init', msg);
            throw err;
        }
    }

    createSocketBridge(sessionId, webSocket) {
        const EventEmitter = require('events');
        const { Buffer } = require('node:buffer');

        class DurableObjectWebSocket extends EventEmitter {
            constructor(id, ws) {
                super();
                this.id = id;
                this.ws = ws;
                this.remoteAddress = '0.0.0.0';
                this.destroyed = false;
                this._socket = new EventEmitter();
                this._socket.remoteAddress = '0.0.0.0';
                this._socket.setTimeout = () => { };
            }
            send(data) {
                if (this.destroyed || this.ws.readyState !== 1) return;
                try {
                    if (Buffer.isBuffer(data)) {
                        this.ws.send(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
                    } else {
                        this.ws.send(data);
                    }
                } catch (error) { console.error('[DO] Error sending to WebSocket:', error); }
            }
            write(data) { this.send(data); }
            connect() { }
            terminate() {
                this.destroyed = true;
                try { this.ws.close(); } catch (e) { }
            }
            destroy() { this.terminate(); }
            end() { this.terminate(); }
            setKeepAlive() { }
            setTimeout(timeout) { this._timeout = timeout; }
            toString() { return `[DurableObjectWebSocket ${this.id}]`; }
        }
        return new DurableObjectWebSocket(sessionId, webSocket);
    }

    async alarm() {
        if (!this.server) return;
        try {
            if (typeof this.server.tick === 'function') {
                await this.server.tick();
            } else if (this.server.world && typeof this.server.world.tick === 'function') {
                await this.server.world.tick();
            }

            if (Date.now() - this.lastAutoSave > 300000) {
                this.lastAutoSave = Date.now();
                const auth = this._getAuth();
                const promises = [];
                for (const [sid, s] of this.sessions) {
                    if (s.username && s.playerData) {
                        promises.push(auth.savePlayerData(s.username, s.playerData).catch(e => { }));
                    }
                }
                await Promise.all(promises);
            }
        } catch (e) {
            console.error('Tick Error:', e);
            this.env.KV_BINDING.put('debug_error_tick_' + Date.now(), e.message).catch(() => { });
        }
        await this.state.storage.setAlarm(Date.now() + 640);
    }
}

// ========================================
// DURABLE OBJECT: PlayerDO
// ========================================

class GameWorld {
    constructor(state, env) { console.log('Mock GameWorld Initialized'); }
    async webSocketMessage(ws, msg) { console.log('Mock Msg:', msg); }
    async webSocketClose(ws) { console.log('Mock Close'); }
    async alarm() { console.log('Mock Tick'); }
}

const SAFETY_DAILY_CAP = 90000;

export class PlayerDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.players = new Map();
        this.requestCount = 0;
        this.lastReset = Date.now();
        this.game = new GameWorld(state, env);
        this.state.blockConcurrencyWhile(async () => {
            await this.loadState();
        });
    }

    async fetch(request) {
        if (this.checkSafetyCap()) {
            return new Response("Free Tier Limit Reached - Come back tomorrow!", { status: 429 });
        }
        if (request.headers.get('Upgrade') === 'websocket') {
            return this.handleWebSocket(request);
        }
        const url = new URL(request.url);
        if (url.pathname === '/health') {
            return Response.json({ status: 'ok', players: this.players.size, reqs: this.requestCount });
        }
        return new Response('RSC Zero-Cost Shard Active', { status: 200 });
    }

    checkSafetyCap() {
        const now = new Date();
        const last = new Date(this.lastReset);
        if (now.getUTCDate() !== last.getUTCDate()) {
            this.requestCount = 0;
            this.lastReset = Date.now();
        }
        this.requestCount++;
        const cap = parseInt(this.env.SAFETY_REQ_CAP || SAFETY_DAILY_CAP);
        if (this.requestCount > cap) {
            console.warn(`SAFETY: Limit hit (${this.requestCount}/${cap}). Rejecting requests.`);
            return true;
        }
        return false;
    }

    async handleWebSocket(request) {
        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);
        this.state.acceptWebSocket(server);
        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws, msg) {
        const data = JSON.parse(msg);
        if (!this.players.has(ws) && data.type === 'login') {
            await this.handleLogin(ws, data);
        }
        await this.game.webSocketMessage(ws, msg);
    }

    async handleLogin(ws, data) {
        this.players.set(ws, { username: data.username, joined: Date.now() });
        if (this.env.DB) {
            try {
                await this.env.DB.prepare(
                    `INSERT INTO game_stats(event_type, data, timestamp) VALUES (?, ?, ?)`
                ).bind('login', JSON.stringify({ user: data.username }), Date.now()).run();
            } catch (e) { console.error("D1 Log Error:", e); }
        }
    }

    async webSocketClose(ws) {
        const p = this.players.get(ws);
        this.players.delete(ws);
        await this.game.webSocketClose(ws);
        if (p && this.env.DB) {
            try {
                await this.env.DB.prepare(
                    `INSERT INTO game_stats(event_type, data, timestamp) VALUES (?, ?, ?)`
                ).bind('logout', JSON.stringify({ user: p.username }), Date.now()).run();
            } catch (e) { console.error("D1 Log Error:", e); }
        }
    }

    async alarm() {
        await this.game.alarm();
    }

    async loadState() { }
}

// ========================================
// WORKER FETCH HANDLER
// ========================================

const DEFAULT_PLAYER = {
    username: "guest",
    group: 0,
    x: 213, y: 436,
    fatigue: 0,
    combatStyle: 0,
    skills: {
        attack: { current: 1, experience: 0 },
        defense: { current: 1, experience: 0 },
        strength: { current: 1, experience: 0 },
        hits: { current: 10, experience: 1154 },
        ranged: { current: 1, experience: 0 },
        prayer: { current: 1, experience: 0 },
        magic: { current: 1, experience: 0 },
        cooking: { current: 1, experience: 0 },
        woodcutting: { current: 1, experience: 0 },
        fletching: { current: 1, experience: 0 },
        fishing: { current: 1, experience: 0 },
        firemaking: { current: 1, experience: 0 },
        crafting: { current: 1, experience: 0 },
        smithing: { current: 1, experience: 0 },
        mining: { current: 1, experience: 0 },
        herblaw: { current: 1, experience: 0 },
        agility: { current: 1, experience: 0 },
        thieving: { current: 1, experience: 0 }
    },
    inventory: [],
    bank: [],
    friends: [],
    ignores: [],
    loginDate: 0
};

function calculateCombat(skills) {
    if (!skills) return 3;
    const att = skills.attack ? skills.attack.current : 1;
    const def = skills.defense ? skills.defense.current : 1;
    const str = skills.strength ? skills.strength.current : 1;
    const hits = skills.hits ? skills.hits.current : 10;
    const pray = skills.prayer ? skills.prayer.current : 1;
    const mag = skills.magic ? skills.magic.current : 1;
    const adp = skills.ranged ? skills.ranged.current : 1;

    const base = 0.25 * (def + hits + Math.floor(pray / 2));
    const melee = 0.325 * (att + str);
    const range = 0.325 * (Math.floor(adp / 2) + adp);
    const magic = 0.325 * (Math.floor(mag / 2) + mag);

    return Math.floor(base + Math.max(melee, range, magic));
}

function getContentType(path) {
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.json')) return 'application/json';
    if (path.endsWith('.glb')) return 'model/gltf-binary';
    return 'application/octet-stream';
}

async function handleFetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    // AI Gateway interception (lazy-load handler)
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname.startsWith('/ai/'))) {
        const { handleAI } = require('./ai-handler.js');
        return await handleAI(request, env);
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (url.pathname === '/health') {
        return new Response('RSC Zero-Cost Router Online', { status: 200, headers: corsHeaders });
    }

    if (url.pathname === '/api/register' && request.method === 'POST') {
        return handleRegister(request, env, corsHeaders);
    }
    if (url.pathname === '/api/login' && request.method === 'POST') {
        return handleLogin(request, env, corsHeaders);
    }
    if (url.pathname === '/api/status') {
        return handleStatus(request, env, corsHeaders);
    }
    if (url.pathname === '/api/highscores') {
        return handleHighscores(request, env, corsHeaders);
    }

    if (url.pathname.startsWith('/asset/')) {
        return await handleAsset(request, env, url, corsHeaders);
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
        if (env.ASSETS) {
            try {
                const assetResponse = await env.ASSETS.fetch(request);
                if (assetResponse.status !== 404) return assetResponse;
            } catch (e) { }
        }
    }

    // Regional game sharding
    const country = request.cf?.country || 'US';
    const shardMapping = env.SHARD_MAPPING ? JSON.parse(env.SHARD_MAPPING) : {};
    const shardBindingName = shardMapping[country] || 'DO_AMERICAS';
    const doBinding = env[shardBindingName];

    if (!doBinding) {
        return new Response(`Configuration Error: Region ${shardBindingName} not found`, { status: 500, headers: corsHeaders });
    }

    const id = doBinding.idFromName(shardBindingName);
    const stub = doBinding.get(id);
    return stub.fetch(request);
}

async function handleRegister(request, env, corsHeaders) {
    try {
        const { username, password } = await request.json();
        if (!username || !password || username.length < 2 || password.length < 2) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), { status: 400, headers: corsHeaders });
        }
        const cleanUser = username.toLowerCase();

        let exists = false;
        if (env.DB) {
            const res = await env.DB.prepare('SELECT 1 FROM players WHERE username = ?').bind(cleanUser).first();
            exists = !!res;
        } else if (env.KV_BINDING || env.KV) {
            const kv = env.KV_BINDING || env.KV;
            exists = await kv.get(`player:${cleanUser}`) !== null;
        }

        if (exists) {
            return new Response(JSON.stringify({ success: false, error: 'Username taken' }), { status: 409, headers: corsHeaders });
        }

        const newPlayer = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
        newPlayer.username = cleanUser;
        newPlayer.password = password;
        newPlayer.loginDate = Date.now();

        if (env.DB) {
            await env.DB.prepare('INSERT INTO players (username, data, updated_at) VALUES (?, ?, ?)')
                .bind(cleanUser, JSON.stringify(newPlayer), Date.now()).run();
        } else if (env.KV_BINDING || env.KV) {
            const kv = env.KV_BINDING || env.KV;
            await kv.put(`player:${cleanUser}`, JSON.stringify(newPlayer));
        }

        return new Response(JSON.stringify({ success: true, message: 'Account created' }), { status: 201, headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleLogin(request, env, corsHeaders) {
    try {
        const { username, password } = await request.json();
        const cleanUser = (username || '').toLowerCase();

        let data = null;
        if (env.DB) {
            const res = await env.DB.prepare('SELECT data FROM players WHERE username = ?').bind(cleanUser).first();
            if (res) data = JSON.parse(res.data);
        } else if (env.KV_BINDING || env.KV) {
            const kv = env.KV_BINDING || env.KV;
            data = await kv.get(`player:${cleanUser}`, { type: 'json' });
        }

        if (!data) {
            return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404, headers: corsHeaders });
        }

        if (data.pass !== password && data.password !== password) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid password' }), { status: 401, headers: corsHeaders });
        }

        return new Response(JSON.stringify({
            success: true,
            username: cleanUser,
            group: data.group || 0,
            combat: calculateCombat(data.skills)
        }), { status: 200, headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500, headers: corsHeaders });
    }
}

async function handleStatus(request, env, corsHeaders) {
    try {
        const shardMapping = env.SHARD_MAPPING ? JSON.parse(env.SHARD_MAPPING) : {};
        const country = request.cf?.country || 'US';
        const shardBindingName = shardMapping[country] || 'DO_AMERICAS';
        const doBinding = env[shardBindingName];

        if (!doBinding) return new Response(JSON.stringify({ players: 0, status: 'Offline' }), { headers: corsHeaders });

        const id = doBinding.idFromName(shardBindingName);
        const stub = doBinding.get(id);
        const response = await stub.fetch('http://do/status');
        const data = await response.json();

        return new Response(JSON.stringify({
            players: data.players,
            npcs: data.npcs,
            ticks: data.ticks,
            region: shardBindingName
        }), { headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify({ players: 0, error: e.message }), { headers: corsHeaders });
    }
}

async function handleHighscores(request, env, corsHeaders) {
    try {
        let players = [];
        if (env.DB) {
            const { results } = await env.DB.prepare('SELECT username, data FROM players ORDER BY updated_at DESC LIMIT 50').all();
            players = results.map(r => {
                const p = JSON.parse(r.data);
                return { username: r.username, skills: p.skills, group: p.group };
            });
        }

        const leaders = players.map(p => {
            let totalLevel = 0;
            let totalXp = 0;
            if (p.skills) {
                for (const key in p.skills) {
                    totalLevel += p.skills[key].current;
                    totalXp += p.skills[key].experience;
                }
            }
            return { username: p.username, totalLevel, totalXp, group: p.group };
        });

        leaders.sort((a, b) => b.totalLevel - a.totalLevel || b.totalXp - a.totalXp);
        return new Response(JSON.stringify(leaders.slice(0, 10)), { headers: corsHeaders });
    } catch (e) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
}

async function handleAsset(request, env, url, corsHeaders) {
    const path = url.pathname.slice(7);

    if (env.FEATURE_R2_ASSETS === 'true' && env.RSC_ASSETS) {
        try {
            const r2Object = await env.RSC_ASSETS.get(path);
            if (r2Object) {
                const headers = new Headers();
                r2Object.writeHttpMetadata(headers);
                headers.set('etag', r2Object.httpEtag);
                headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                return new Response(r2Object.body, { headers });
            }
        } catch (e) { console.error('R2 Error:', e); }
    }

    if (env.KV) {
        const kvAsset = await env.KV.get(`asset:${path}`, { type: 'stream' });
        if (kvAsset) {
            return new Response(kvAsset, {
                headers: {
                    'Content-Type': getContentType(path),
                    'Cache-Control': 'public, max-age=86400'
                }
            });
        }
    }

    return new Response('Asset Not Found', { status: 404 });
}

async function handleQueue(batch, env, ctx) {
    const { processQueue } = require('./worker-queue.js');
    await processQueue(batch, env);
}

// ES Module default export
export default {
    fetch: handleFetch,
    queue: handleQueue
};
