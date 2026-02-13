// communicate with https://github.com/2003scape/rsc-data-server

const uid = require('rand-token').uid;
const log = {
    error: console.error,
    info: console.log,
    debug: console.debug
};

// Conditional require for Node.js environment
let JSONSocket, net;
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'worker') {
    try {
        JSONSocket = require('json-socket');
        net = require('net');
    } catch (e) { }
}

const TIMEOUT = 10000;

// Default new player data - must match browser-data-client.js
const DEFAULT_PLAYER = {
    username: '',
    password: '',
    group: 0, // 0=player, 2=mod, 3=admin
    x: 213,
    y: 436,
    fatigue: 0,
    combatStyle: 0,
    blockChat: 0,
    blockPrivateChat: 0,
    blockTrade: 0,
    blockDuel: 0,
    cameraAuto: 0,
    oneMouseButton: 0,
    soundOn: 1,
    hairColour: 2,
    topColour: 8,
    trouserColour: 14,
    skinColour: 0,
    headSprite: 1,
    bodySprite: 2,
    skulled: 0,
    friends: [],
    ignores: [],
    inventory: [],
    bank: [],
    questPoints: 0,
    questStages: {},
    skills: {
        attack: { current: 1, experience: 0 },
        defense: { current: 1, experience: 0 },
        strength: { current: 1, experience: 0 },
        hits: { current: 9, experience: 2304 }, // RSC Level 9 with 4x multiplier
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
    cache: {},
    loginIP: null,
    world: 0
};

class DataClient {
    constructor(server) {
        this.server = server;
        this.world = this.server.world;
        this.connected = false;

        // Valid for Node.js mode only
        if (net && JSONSocket) {
            this.socket = new JSONSocket(new net.Socket());
            this.socket.on('error', (err) => log.error(err));
            this.socket.on('message', (message) => this.handleMessage(message));
            this.socket.on('close', (hadError) => {
                this.socket._socket.removeAllListeners('ready');
                this.connected = false;
                log.error(`data-client closed. hadError: ${hadError}`);
                // Reconnect logic...
            });
        }
    }

    get db() {
        return this.server.env && this.server.env.DB;
    }

    get kv() {
        return this.server.env && (this.server.env.KV_BINDING || this.server.env.KV);
    }

    connect() {
        if (this.db || this.kv) {
            this.connected = true;
            return Promise.resolve();
        }
        // ... legacy connect ...
        return new Promise((resolve, reject) => {
            const { config } = this.server;
            this.socket._socket.once('error', reject);
            this.socket._socket.once('ready', () => {
                this.socket._socket.removeListener('error', reject);
                resolve();
                this.connected = true;
                log.info('connected');
            });
            if (config.dataServerFile) {
                this.socket.connect(config.dataServerFile);
            } else {
                const [host, port] = config.dataServerTCP.split(':');
                this.socket.connect(+port, host);
            }
        });
    }

    async init() {
        try {
            const keys = this.server.env ? Object.keys(this.server.env).join(',') : 'null';
            const hasKV = !!(this.server.env && (this.server.env.KV || this.server.env.KV_BINDING));
            const msg = `DataClient Init. Env Keys: ${keys}. HasKV: ${hasKV}`;
            console.log(msg);
            if (hasKV) {
                await (this.server.env.KV || this.server.env.KV_BINDING).put('debug_init_log', msg);
            }
        } catch (e) { console.error(e); }

        if (this.db || this.kv) {
            console.log('[DataClient] Initialized with Cloudflare Storage (D1/KV)');
            this.connected = true;
            return;
        }
        await this.connect();
        await this.authenticate();
        await this.worldConnect();
    }

    end() {
        if (this.socket) this.socket.end();
    }

    handleMessage(message) {
        log.debug('received message', message);
        switch (message.handler) {
            case 'playerLoggedIn':
            case 'playerWorldChange':
                this.world.sendForeignPlayerWorld(message.username, message.world);
                break;
            case 'playerLoggedOut':
                this.world.sendForeignPlayerWorld(message.username, 0);
                break;
            case 'playerMessage': {
                const player = this.world.getPlayerByUsername(message.toUsername);
                if (!player || player.blockPrivateChat || player.ignores.indexOf(message.fromUsername) > -1) {
                    return;
                }
                player.receivePrivateMessage(message.fromUsername, message.message);
                break;
            }
        }
    }

    send(message) {
        if (!this.connected) return;
        if (this.db || this.kv) {
            // For fire-and-forget messages in D1 mode
            if (message.handler === 'playerLogout') {
                // Nothing urgent, saved on logout anyway
            }
            return;
        }

        const token = uid(64);
        message.token = token;
        log.debug('sending message', message);
        this.socket.sendMessage(message);
    }

    async sendAndReceive(message) {
        if (this.db || this.kv) {
            return this.handleD1Message(message);
        }

        if (!this.connected) return;

        const token = uid(64);
        message.token = token;
        log.debug('sending message', message);

        return new Promise((resolve) => {
            // ... legacy promise logic ...
            let onMessage, onError, messageTimeout;
            onMessage = (receivedMessage) => {
                if (receivedMessage.token !== token) return;
                clearTimeout(messageTimeout);
                this.socket._socket.removeListener('message', onMessage);
                this.socket._socket.removeListener('error', onError);
                delete receivedMessage.token;
                receivedMessage.handler = message.handler;
                resolve(receivedMessage);
            };
            onError = () => {
                clearTimeout(messageTimeout);
                this.socket._socket.removeListener('message', onMessage);
                this.socket._socket.removeListener('error', onError);
            };
            this.socket.on('message', onMessage);
            this.socket.on('error', onError);
            messageTimeout = setTimeout(() => {
                this.socket._socket.removeListener('error', onError);
                this.socket._socket.removeListener('message', onMessage);
                log.error(new Error(`timeout on response for ${message.handler}`));
            }, TIMEOUT);
            this.socket.sendMessage(message);
        });
    }

    // --- Storage Implementation (KV or D1) ---

    async handleD1Message(message) {
        // Renamed concept mentally, keeping name compatibility or just dispatching
        // Dispatch to appropriate storage handler
        if (['authenticate', 'worldConnect'].includes(message.handler)) {
            return { success: true };
        }

        if (message.handler === 'playerLogin') {
            return this.storagePlayerLogin(message);
        }

        if (message.handler === 'playerUpdate') {
            return this.storagePlayerSave(message);
        }

        if (message.handler === 'playerRegister') {
            return this.storagePlayerRegister(message);
        }

        if (message.handler === 'playerGetWorlds') {
            return { usernameWorlds: {} };
        }

        console.warn(`[DataClient] Unhandled Storage message: ${message.handler}`);
        return { success: false, error: 'Not implemented' };
    }

    async storagePlayerLogin(msg) {
        const { username, password } = msg;
        const cleanUser = username.toLowerCase();

        try {
            let data;

            // 1. Try KV
            if (this.kv) {
                const kvData = await this.kv.get(`player:${cleanUser}`, { type: 'json' });
                if (kvData) data = kvData;
            }
            // 2. Fallback to D1
            else if (this.db) {
                const result = await this.db.prepare('SELECT data FROM players WHERE username = ?').bind(cleanUser).first();
                if (result) data = JSON.parse(result.data);
            }

            if (data) {
                // Found existing player
                if (data.pass !== password) {
                    return { success: false, code: 3 }; // Invalid credentials
                }

                data.id = -1; // Mock ID
                data.username = cleanUser;
                data.group = data.group || 0;

                return { success: true, code: 0, player: data };
            } else {
                // New Player? Auto-register
                console.log(`[DataClient] Creating new user: ${cleanUser}`);

                const newPlayer = {
                    username: cleanUser,
                    pass: password,
                    x: 329, y: 552,
                    fatigue: 0,
                    combatStyle: 0,
                    blockChat: 0, blockPrivateChat: 0, blockTrade: 0, blockDuel: 0,
                    cameraAuto: 0, oneMouseButton: 0,
                    loginDate: Date.now(),
                    friends: [], ignores: [],
                    skills: {},
                    inventory: [], bank: [],
                    questPoints: 0, questStages: {}
                };

                // Save to KV or D1
                await this.performSave(cleanUser, newPlayer);

                return { success: true, code: 0, player: newPlayer };
            }

        } catch (e) {
            console.error('[DataClient] Login Error:', e);
            return { success: false, code: 5 };
        }
    }

    async storagePlayerSave(msg) {
        const username = msg.username.toLowerCase();
        const dataToSave = { ...msg };
        delete dataToSave.handler;
        delete dataToSave.token;

        // Queue Optimization
        if (this.server.env.PLAYER_QUEUE) {
            try {
                await this.server.env.PLAYER_QUEUE.send({
                    type: 'save',
                    username: username,
                    data: dataToSave
                });
                return { success: true };
            } catch (err) {
                console.error('[DataClient] Queue Error (Fallback to direct):', err);
            }
        }

        try {
            await this.performSave(username, dataToSave);
            return { success: true };
        } catch (e) {
            console.error('[DataClient] Save Error:', e);
            return { success: false };
        }
    }

    async storagePlayerRegister(msg) {
        const { username, password } = msg;
        const cleanUser = username.toLowerCase();

        try {
            await this.logToKV('debug_register_log', `Start register: ${cleanUser}`);
            let exists = false;

            if (this.kv) {
                await this.logToKV('debug_register_log', `Checking KV for ${cleanUser}`);
                exists = await this.kv.get(`player:${cleanUser}`) !== null;
            } else if (this.db) {
                exists = await this.db.prepare('SELECT 1 FROM players WHERE username = ?').bind(cleanUser).first();
            }

            if (exists) {
                await this.logToKV('debug_register_log', `User exists: ${cleanUser}`);
                return { success: false, code: 3 }; // Taken
            }

            console.log(`[DataClient] Registering new user: ${cleanUser}`);
            await this.logToKV('debug_register_log', `Creating NEW user: ${cleanUser}`);

            // Clone DEFAULT_PLAYER and set user-specific values
            const newPlayer = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
            newPlayer.username = cleanUser;
            newPlayer.password = password;
            newPlayer.loginDate = Date.now();

            await this.performSave(cleanUser, newPlayer);
            await this.logToKV('debug_register_log', `Save complete for: ${cleanUser}`);

            return { success: true, code: 2 };

        } catch (e) {
            console.error('[DataClient] Register Error:', e);
            await this.logToKV('debug_register_log', `ERROR: ${e.message}`);
            return { success: false, code: 5 };
        }
    }

    async logToKV(key, value) {
        try {
            if (this.kv) await this.kv.put(key, value + ' | ' + new Date().toISOString());
        } catch (e) { }
    }

    async performSave(username, data) {
        // Merge with existing if needed? KV `put` overwrites.
        // We might want to read-modify-write if we were being super safe, 
        // but `playerUpdate` from server usually contains FULL state or authoritative deltas.
        // `player.js` save() sends FULL state. 
        // BUT `storagePlayerSave` receives `dataToSave`.
        // Wait, `dataToSave` in `storagePlayerSave` logic merged with `existingData` in previous D1 code.
        // We should replicate merge logic for KV to be safe.

        let merged = data;

        if (this.kv) {
            // Read existing for Merge
            const existing = await this.kv.get(`player:${username}`, { type: 'json' });
            if (existing) {
                merged = { ...existing, ...data };
            }
            await this.kv.put(`player:${username}`, JSON.stringify(merged));
        }
        else if (this.db) {
            const existing = await this.db.prepare('SELECT data FROM players WHERE username = ?').bind(username).first();
            if (existing) {
                const existingData = JSON.parse(existing.data);
                merged = { ...existingData, ...data };
                await this.db.prepare('UPDATE players SET data = ?, updated_at = ? WHERE username = ?')
                    .bind(JSON.stringify(merged), Date.now(), username).run();
            } else {
                await this.db.prepare('INSERT INTO players (username, data, updated_at) VALUES (?, ?, ?)')
                    .bind(username, JSON.stringify(merged), Date.now()).run();
            }
        }
    }

    // --- Legacy Passthroughs ---
    async authenticate() {
        if (this.db || this.kv) return;
        return this.sendAndReceive({ handler: 'authenticate', password: this.server.config.dataServerPassword });
    }

    async worldConnect() {
        if (this.db || this.kv) return;
        const { config } = this.server;
        return this.sendAndReceive({
            handler: 'worldConnect',
            id: config.worldID,
            tcpPort: config.tcpPort,
            websocketPort: config.websocketPort,
            members: config.members,
            country: config.country
        });
    }

    async playerLogin(data) {
        if (this.db || this.kv) return this.storagePlayerLogin(data);
        return this.sendAndReceive({ handler: 'playerLogin', ...data });
    }

    playerLogout(username) {
        if (this.db || this.kv) return; // Save handled by player.save() -> playerUpdate
        this.send({ handler: 'playerLogout', username });
    }

    playerWorldChange(username, worldID) {
        if (this.db || this.kv) return;
        this.send({ handler: 'playerWorldChange', username, world: worldID });
    }

    async playerRegister(data) {
        if (this.db || this.kv) return this.storagePlayerRegister(data);
        return this.sendAndReceive({ handler: 'playerRegister', ...data });
    }

    playerMessage(fromUsername, toUsername, message) {
        if (this.db || this.kv) return; // private messages between shards not supported yet
        this.send({ handler: 'playerMessage', fromUsername, toUsername, message });
    }
}

module.exports = DataClient;
