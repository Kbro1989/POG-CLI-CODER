/**
 * PlayerDO - The Zero-Cost Game Engine Core
 * ES Module Format (required by Wrangler for Durable Objects)
 */

class GameWorld {
    constructor(state, env) { console.log('Mock GameWorld Initialized'); }
    async webSocketMessage(ws, msg) { console.log('Mock Msg:', msg); }
    async webSocketClose(ws) { console.log('Mock Close'); }
    async alarm() { console.log('Mock Tick'); }
}

const TICK_RATE = 640;
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
            } catch (e) {
                console.error("D1 Log Error:", e);
            }
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

    async loadState() {
        // Load persistent state if needed
    }
}
