/**
 * RSCServerDO - Durable Object for RuneScape Classic Server
 * Production Version with JSON Auth
 */

const { Buffer } = require('node:buffer');
const Server = require('../rsc-server/src/server.js');
const { AuthService } = require('./auth.js');
// const land63 = require('../rsc-server/node_modules/@2003scape/rsc-landscape/land63.jag');
// const maps63 = require('../rsc-server/node_modules/@2003scape/rsc-landscape/maps63.jag');
// const landmem63 = require('../rsc-server/node_modules/@2003scape/rsc-landscape/land63.mem');
// const mapsmem63 = require('../rsc-server/node_modules/@2003scape/rsc-landscape/maps63.mem');

class RSCServerDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;

        // Auth Service
        this.auth = new AuthService(env);

        // Track WebSocket sessions
        this.sessions = new Map();

        // Shared RSC Server instance
        this.server = null;

        // Session counter
        this.sessionCounter = 0;

        // Auto-save tracking
        this.lastAutoSave = Date.now();

        console.log('RSCServerDO initialized. Env keys:', Object.keys(env));
    }

    async fetch(request) {
        try {
            const url = new URL(request.url);
            const upgradeHeader = request.headers.get('Upgrade');

            // Monitoring Endpoints
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

            // WebSocket Upgrade
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

        // Debug Log
        this.env.KV_BINDING.put(`debug_sess_start_${sessionId}`, `Started`).catch(() => { });

        // Create socket bridge but DO NOT CONNECT until auth
        const socketBridge = this.createSocketBridge(sessionId, webSocket);

        webSocket.addEventListener('message', async (event) => {
            // 1. JSON Auth Handling (Pre-Auth)
            if (!session.authenticated && typeof event.data === 'string') {
                try {
                    const jsonMsg = JSON.parse(event.data);

                    if (jsonMsg.type === 'register') {
                        await this.handleRegister(sessionId, jsonMsg);
                        return;
                    }

                    if (jsonMsg.type === 'login') {
                        const success = await this.handleLogin(sessionId, jsonMsg);
                        if (success) {
                            session.authenticated = true;
                            // Connect to Server using NEW method that injects player
                            await this.server.handleAuthenticatedConnection(
                                socketBridge,
                                session.username,
                                session.playerData
                            );
                        }
                        return;
                    }
                } catch (e) { /* ignore JSON parse errors in pre-auth */ }
            }

            // 2. Authenticated Message Handling
            if (session.authenticated) {
                // Check for Logout (JSON)
                if (typeof event.data === 'string') {
                    try {
                        const jsonMsg = JSON.parse(event.data);
                        if (jsonMsg.type === 'logout') {
                            await this.handleLogout(sessionId);
                            return;
                        }
                    } catch (e) { }
                }

                // Forward ALL packets (binary or text) to Bridge
                // RSC Protocol is binary, but we might have text extensions
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

            // Bridge close
            socketBridge.emit('close', false);

            // Save on disconnect
            if (session.username && session.playerData) {
                try {
                    await this.auth.savePlayerData(session.username, session.playerData);
                } catch (e) { console.error('Save Error:', e); }
            }
        });

        webSocket.addEventListener('error', (error) => {
            console.error('[DO] WebSocket error:', error);
            this.sessions.delete(sessionId);
            socketBridge.emit('error', error);
        });
    }

    // --- Auth Handlers ---

    async handleRegister(sessionId, { username, password }) {
        try {
            const result = await this.auth.createUser(username, password);
            const session = this.sessions.get(sessionId);
            if (session) session.socket.send(JSON.stringify({ type: 'register_success', username: result.username }));
        } catch (error) {
            const session = this.sessions.get(sessionId);
            if (session) session.socket.send(JSON.stringify({ type: 'register_failure', reason: error.message }));
        }
    }

    async handleLogin(sessionId, { username, password }) {
        try {
            const { playerData } = await this.auth.login(username, password);
            const session = this.sessions.get(sessionId);
            if (!session) return false;

            session.username = username;
            session.playerData = playerData;

            this.broadcastPlayerJoined(username, sessionId);
            session.socket.send(JSON.stringify({ type: 'login_success', username, playerData }));

            return true;
        } catch (error) {
            const session = this.sessions.get(sessionId);
            if (session) session.socket.send(JSON.stringify({ type: 'login_failure', reason: error.message }));
            return false;
        }
    }

    async handleLogout(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session || !session.username) return;

        try {
            await this.auth.savePlayerData(session.username, session.playerData);
            this.broadcastPlayerLeft(session.username, sessionId);
            session.socket.send(JSON.stringify({ type: 'logout_success' }));

            // Should we disconnect logic? The close listener handles the bridge.
            session.authenticated = false;
        } catch (error) {
            console.error(`[DO] Logout error:`, error);
        }
    }

    broadcastPlayerJoined(username, excludeSessionId) {
        // Optional: Broadcast to others? RSC usually handles this via binary updates.
    }

    broadcastPlayerLeft(username, excludeSessionId) {
    }

    async initializeServer() {
        console.log('[DO] Initializing RSC Server...');
        // Production Configuration
        const config = {
            worldID: 1,
            version: 204,
            members: true,
            experienceRate: 4,
            tcpPort: null,
            websocketPort: null,
            landscapeData: undefined // Disabled for debugging
            /* {
                landMsg: Buffer.from(land63),
                mapsJag: Buffer.from(maps63),
                landMem: Buffer.from(landmem63),
                mapsMem: Buffer.from(mapsmem63)
            } */
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
        class DurableObjectWebSocket extends EventEmitter {
            constructor(id, ws) {
                super();
                this.id = id;
                this.ws = ws;
                this.remoteAddress = '0.0.0.0';
                this.destroyed = false;
                const socketSelf = this;
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
            // Tick
            if (typeof this.server.tick === 'function') {
                await this.server.tick();
            } else if (this.server.world && typeof this.server.world.tick === 'function') {
                await this.server.world.tick();
            }

            // Auto-Save Check (Every 5 minutes)
            if (Date.now() - this.lastAutoSave > 300000) { // 5 mins
                this.lastAutoSave = Date.now();
                // console.log('[DO] Running Auto-Save...');
                const promises = [];
                for (const [sid, s] of this.sessions) {
                    if (s.username && s.playerData) {
                        promises.push(this.auth.savePlayerData(s.username, s.playerData).catch(e => { }));
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

module.exports = { RSCServerDO };
