console.log('SANITY CHECK: I AM RUNNING');
// const BrowserSocket = require('./browser-socket');
console.log('Loading dependencies...');
let RSCSocket, World, Player, packetHandlers;
try {
    console.log('Requiring @2003scape/rsc-socket...');
    RSCSocket = require('@2003scape/rsc-socket');
    console.log('Loaded rsc-socket');
} catch (e) { console.error('Failed to load rsc-socket:', e); }

try {
    console.log('Requiring ./model/world...');
    World = require('./model/world');
    console.log('Loaded world');
} catch (e) { console.error('Failed to load world:', e); }

try {
    console.log('Requiring ./model/player...');
    Player = require('./model/player');
    console.log('Loaded player');
} catch (e) { console.error('Failed to load player:', e); }

try {
    console.log('Requiring ./packet-handlers...');
    packetHandlers = require('./packet-handlers');
    console.log('Loaded packet-handlers');
} catch (e) { console.error('Failed to load packet-handlers:', e); }

const isBrowser = typeof process !== 'undefined' && process.browser;
const toBuffer = isBrowser ? require('typedarray-to-buffer') : undefined;

// Cloudflare Worker Mode: No global requires for Node modules
let net, ws, bole;
if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'worker') {
    try {
        net = require('net');
        ws = require('ws');
        bole = require('bole');
    } catch (e) { }
}

const log = bole ? bole('server') : {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.log,
};

console.log('Loading data-client...');
const DataClient = isBrowser
    ? require('./browser-data-client')
    : require('./data-client');


class Server {
    constructor(config, env) {
        this.config = config;
        this.env = env; // Store env for KV access in Durable Objects
        this.isBrowser = !!isBrowser;
        this.isDurableObject = !!(env && (env.KV || env.KV_BINDING) && !isBrowser); // Detect DO mode

        this.world = new World(this);
        this.dataClient = new DataClient(this);

        this.incomingMessages = new Map();
        this.outgoingMessages = [];

        if (isBrowser) {
            this.browserSockets = {};
        }
    }

    loadPacketHandlers() {
        this.handlers = {};

        for (const file of Object.keys(packetHandlers)) {
            const handlers = packetHandlers[file];

            for (const handlerName of Object.keys(handlers)) {
                this.handlers[handlerName] = handlers[handlerName];
            }
        }
    }

    handleConnection(socket) {
        if (this.env && this.env.KV_BINDING) {
            this.env.KV_BINDING.put('debug_srv_conn_' + Date.now(), 'server.handleConnection called').catch(() => { });
        }

        socket = new RSCSocket(socket);
        socket.setTimeout(5000);
        socket.server = this;

        this.incomingMessages.set(socket, []);

        socket.on('error', (err) => {
            log.error(err);
            if (socket.server && socket.server.env && socket.server.env.KV_BINDING) {
                socket.server.env.KV_BINDING.put('debug_srv_err_' + Date.now(), err.message).catch(() => { });
            }
        });
        socket.on('timeout', () => {
            if (socket.server && socket.server.env && socket.server.env.KV_BINDING) {
                socket.server.env.KV_BINDING.put('debug_srv_to_' + Date.now(), 'Socket Timeout').catch(() => { });
            }
            socket.close();
        });

        socket.on('message', async (message) => {
            try {
                if (socket.server && socket.server.env && socket.server.env.KV_BINDING) {
                    await socket.server.env.KV_BINDING.put('debug_msg_recv_' + Date.now() + '_' + Math.random(), `Recv: ${message.type}`);
                }
            } catch (e) { }
            if (
                !socket.player &&
                !/register|login|session|closeConnection/.test(message.type)
            ) {
                log.warn(`${socket} sending ${message.type} before login`);
                socket.close();
                return;
            }

            const queue = this.incomingMessages.get(socket);
            //const messagesSent = queue.length;

            log.debug(`incoming message from ${socket}`, message);
            queue.push(message);

            if (queue.length >= 10) {
                queue.shift();
            }
        });

        socket.on('close', async () => {
            try {
                if (socket.server && socket.server.env && socket.server.env.KV_BINDING) {
                    await socket.server.env.KV_BINDING.put('debug_close_' + Date.now() + '_' + Math.random(), 'Socket Closed');
                }
            } catch (e) { }
            if (socket.player) {
                if (socket.player.loggedIn) {
                    await socket.player.logout();
                }

                delete socket.player;
                delete socket.server;
            }

            socket.removeAllListeners();
            this.incomingMessages.delete(this);
            log.info(`${socket} disconnected`);
        });

        log.info(`${socket} connected`);
    }

    /**
     * Handle a connection that has already been authenticated via JSON Auth (Durable Object)
     * @param {object} socket - The socket/bridge
     * @param {string} username - The authenticated username
     * @param {object} playerData - The loaded player data
     */
    async handleAuthenticatedConnection(socket, username, playerData) {
        if (this.env && this.env.KV_BINDING) {
            this.env.KV_BINDING.put('debug_auth_conn_' + Date.now(), `Handling auth conn: ${username}`).catch(() => { });
        }

        socket = new RSCSocket(socket);
        socket.setTimeout(5000);
        socket.server = this;

        this.incomingMessages.set(socket, []);

        // Listen for errors/close to cleanup
        socket.on('error', (err) => log.error(err));
        socket.on('timeout', () => socket.close());

        // Standard message listener (for game packets)
        socket.on('message', async (message) => {
            // Bypass login check since we inject player immediately
            if (!socket.player) {
                // Should not happen if we inject correctly below
            }
            const queue = this.incomingMessages.get(socket);
            queue.push(message);
            if (queue.length >= 10) queue.shift();
        });

        socket.on('close', async () => {
            if (socket.player && socket.player.loggedIn) {
                await socket.player.logout();
            }
            delete socket.player;
            delete socket.server;
            socket.removeAllListeners();
            this.incomingMessages.delete(this);
        });

        // Inject Player
        try {
            const player = new Player(socket, playerData);
            socket.player = player;
            await this.world.registerPlayer(player);
            log.info(`${username} connected (authenticated)`);
        } catch (e) {
            log.error(`Failed to register player ${username}:`, e);
            socket.close();
        }
    }

    bindTCP() {
        this.tcpServer = new net.Server();

        this.tcpServer.on('error', (err) => log.error(err));

        this.tcpServer.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        return new Promise((resolve, reject) => {
            this.tcpServer.once('error', reject);

            this.tcpServer.once('listening', () => {
                this.tcpServer.removeListener('error', reject);
                log.info(`listening for TCP connections on port ${port}`);
                resolve();
            });

            const port = this.config.tcpPort;
            this.tcpServer.listen({ port });
        });
    }

    bindWebSocket(httpServer) {
        if (httpServer) {
            this.websocketServer = new ws.Server({ server: httpServer });
            log.info('attached websocket server to existing http server');
        } else {
            const port = this.config.websocketPort;
            this.websocketServer = new ws.Server({ port });
            log.info(`listening for websocket connections on port ${port}`);
        }

        this.websocketServer.on('error', (err) => log.error(err));

        this.websocketServer.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    bindWebWorker() {
        addEventListener('message', (e) => {
            switch (e.data.type) {
                case 'connect': {
                    const browserSocket = new BrowserSocket(e.data.id);
                    this.browserSockets[browserSocket.id] = browserSocket;
                    this.handleConnection(browserSocket);
                    break;
                }
                case 'disconnect': {
                    const browserSocket = this.browserSockets[e.data.id];
                    browserSocket.emit('close', false);
                    delete this.browserSockets[browserSocket.id];
                    break;
                }
                case 'data': {
                    const browserSocket = this.browserSockets[e.data.id];
                    browserSocket.emit('data', toBuffer(e.data.data));
                    break;
                }
            }
        });
    }

    readMessages() {
        for (const [socket, queue] of this.incomingMessages) {
            for (const message of queue) {
                const handler = this.handlers[message.type];

                if (!handler) {
                    console.log(`[DEBUG] No handler for message type: ${message.type} (Opcode? ${message.opcode})`);
                    log.warn(`${socket} no handler for type ${message.type}`);
                    continue;
                }

                console.log(`[DEBUG] Invoking handler for: ${message.type}`);
                handler(socket, message).catch((e) => {
                    console.error(`[DEBUG] Handler error for ${message.type}:`, e);
                    log.error(e, socket.toString());
                });
            }

            queue.length = 0;
        }
    }

    sendMessages() {
        while (this.outgoingMessages.length) {
            const { socket, message } = this.outgoingMessages.shift();
            socket.sendMessage(message);
        }
    }

    async init(httpServer) {
        try {
            if (!this.config.skipDataServer) {
                await this.dataClient.init();
            } else {
                log.info('Skipping DataClient initialization (running in standalone/KV mode)');
            }

            await this.world.loadData();
            this.world.tick();

            this.loadPacketHandlers();

            if (this.isDurableObject) {
                // Durable Object mode - connections are handled externally
                log.info('Running in Durable Object mode');
                log.info(`Server initialized: World=${this.config.worldID}, Members=${this.config.members}`);
            } else if (this.isBrowser) {
                this.bindWebWorker();
                postMessage({ type: 'ready' });
            } else {
                if (!httpServer) {
                    await this.bindTCP();
                }
                this.bindWebSocket(httpServer);
            }
        } catch (e) {
            console.error(e);
            log.error(e);
            if (!this.isDurableObject && typeof process !== 'undefined' && process.exit) {
                process.exit(1);
            } else {
                throw e; // Re-throw in DO mode or environment without process.exit
            }
        }
    }
    async tick() {
        if (this.env && this.env.KV_BINDING) {
            // Optional: Log tick start to ensure it's running (can remove later to reduce noise)
            // await this.env.KV_BINDING.put('debug_tick_' + Date.now(), 'tick').catch(() => {});
        }

        // Run game logic (movement, combat, etc)
        // Note: world.tick() handles readMessages() and sendMessages() internally
        await this.world.tick();
    }
}

module.exports = Server;
