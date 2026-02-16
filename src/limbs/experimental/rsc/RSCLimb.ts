import { BaseLimb } from '../../core/BaseLimb.js';
import { Execution, Result } from '../../../core/models.js';
import * as net from 'net';

interface NPC {
    id: number;
    index: number;
    x: number;
    y: number;
    sprite: number;
}

interface OtherPlayer {
    index: number;
    x: number;
    y: number;
    sprite: number;
}

interface GameObject {
    id: number;
    x: number;
    y: number;
}

interface WorldState {
    player: {
        index: number;
        x: number;
        y: number;
        sprite: number;
    };
    npcs: Map<number, NPC>;
    players: Map<number, OtherPlayer>;
    objects: GameObject[];
}

/**
 * RSCLimb - Active Game Interaction Limb for RuneScape Classic.
 * 
 * Provides tools for AI-driven login, automated terms agreement, and world interaction.
 */
export class RSCLimb extends BaseLimb {
    id = 'RSCLimb';
    type = 'experimental' as const;

    private client: net.Socket | null = null;
    private host = 'localhost';
    private port = 43594;

    private accumulatedData: Buffer = Buffer.alloc(0);
    private sessionIdReceived = false;
    private loggedIn = false;

    private state: WorldState = {
        player: { index: -1, x: 0, y: 0, sprite: 0 },
        npcs: new Map(),
        players: new Map(),
        objects: []
    };

    constructor(config: any, executor: any) {
        super(config, executor);
        this.registerTools([
            {
                name: 'rsc_login',
                description: 'Authenticates the AI with the local RSC server and agrees to global chat rules.',
                parameters: {
                    type: 'object',
                    properties: {
                        username: { type: 'string', description: 'The RSC username to log in with.' },
                        password: { type: 'string', description: 'The RSC password.' }
                    },
                    required: ['username', 'password']
                },
                handler: async (args: Record<string, unknown>) => {
                    return this.login(args['username'] as string, args['password'] as string);
                }
            },
            {
                name: 'rsc_chat',
                description: 'Sends a global chat message from the AI character.',
                parameters: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', description: 'The message to broadcast.' }
                    },
                    required: ['message']
                },
                handler: async (args: Record<string, unknown>) => {
                    return this.chat(args['message'] as string);
                }
            },
            {
                name: 'rsc_get_world_state',
                description: 'Retrieves the current perceived state of the world (nearby NPCs, players, objects).',
                parameters: {
                    type: 'object',
                    properties: {}
                },
                handler: async () => {
                    return {
                        ok: true,
                        value: {
                            output: `Perceived ${this.state.npcs.size} NPCs, ${this.state.players.size} Players, and ${this.state.objects.length} Objects.`,
                            data: {
                                player: this.state.player,
                                npcs: Array.from(this.state.npcs.values()),
                                players: Array.from(this.state.players.values()),
                                objects: this.state.objects
                            }
                        }
                    };
                }
            },
            {
                name: 'rsc_walk',
                description: 'Moves the AI character to the specified global coordinates.',
                parameters: {
                    type: 'object',
                    properties: {
                        x: { type: 'number', description: 'The global X coordinate.' },
                        y: { type: 'number', description: 'The global Y coordinate.' }
                    },
                    required: ['x', 'y']
                },
                handler: async (args: Record<string, unknown>) => {
                    const x = args['x'] as number;
                    const y = args['y'] as number;
                    return this.walk(x, y);
                }
            },
            {
                name: 'rsc_interact_npc',
                description: 'Interacts with an NPC by index (Talk or Attack).',
                parameters: {
                    type: 'object',
                    properties: {
                        index: { type: 'number', description: 'The server-side index of the NPC.' },
                        action: { type: 'string', enum: ['talk', 'attack'], description: 'The action to perform.' }
                    },
                    required: ['index', 'action']
                },
                handler: async (args: Record<string, unknown>) => {
                    const index = args['index'] as number;
                    const action = args['action'] as string;
                    return this.interactNpc(index, action);
                }
            },
            {
                name: 'rsc_interact_object',
                description: 'Interacts with a game object at the specified coordinates.',
                parameters: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', description: 'The object ID (optional, but helps with verification).' },
                        x: { type: 'number', description: 'The global X coordinate of the object.' },
                        y: { type: 'number', description: 'The global Y coordinate of the object.' }
                    },
                    required: ['x', 'y']
                },
                handler: async (args: Record<string, unknown>) => {
                    const x = args['x'] as number;
                    const y = args['y'] as number;
                    return this.interactObject(x, y);
                }
            }
        ]);
    }

    private async walk(x: number, y: number): Promise<Result<Execution>> {
        if (!this.client || !this.loggedIn) return this.notLoggedInResponse();

        this.logger.info({ x, y }, 'RSC Walk Command');
        const payload = Buffer.alloc(4);
        payload.writeUInt16BE(x, 0);
        payload.writeUInt16BE(y, 2);
        this.sendPacket(255, payload); // Opcode 255: WALK_TO_POINT

        return {
            ok: true,
            value: {
                output: `Requested walk to (${x}, ${y}).`,
                data: { status: 'sent', x, y }
            }
        };
    }

    private async interactNpc(index: number, action: string): Promise<Result<Execution>> {
        if (!this.client || !this.loggedIn) return this.notLoggedInResponse();

        this.logger.info({ index, action }, 'RSC NPC Interaction');
        const opcode = action === 'talk' ? 245 : 244;
        const payload = Buffer.alloc(2);
        payload.writeUInt16BE(index, 0);
        this.sendPacket(opcode, payload);

        return {
            ok: true,
            value: {
                output: `Requested ${action} on NPC index ${index}.`,
                data: { status: 'sent', index, action }
            }
        };
    }

    private async interactObject(x: number, y: number): Promise<Result<Execution>> {
        if (!this.client || !this.loggedIn) return this.notLoggedInResponse();

        this.logger.info({ x, y }, 'RSC Object Interaction');
        const payload = Buffer.alloc(4);
        payload.writeUInt16BE(x, 0);
        payload.writeUInt16BE(y, 2);
        this.sendPacket(242, payload); // Opcode 242: OBJECT_COMMAND (Action 1)

        return {
            ok: true,
            value: {
                output: `Requested interaction with object at (${x}, ${y}).`,
                data: { status: 'sent', x, y }
            }
        };
    }

    private notLoggedInResponse(): Result<Execution> {
        return {
            ok: true,
            value: {
                output: 'AI is not logged into RSC. Use rsc_login first.',
                data: { status: 'error', error: 'not_logged_in' }
            }
        };
    }

    private sendPacket(opcode: number, payload: Buffer): void {
        if (!this.client) return;

        const totalLen = payload.length + 1;
        const packet = Buffer.alloc(2 + totalLen);
        packet.writeUInt16BE(totalLen, 0);
        packet.writeUInt8(opcode, 2);
        payload.copy(packet, 3);

        this.client.write(packet);
    }

    private async login(username: string, password: string): Promise<Result<Execution>> {
        if (this.client) {
            this.client.destroy();
        }

        return new Promise((resolve) => {
            this.logger.info({ username }, 'Attempting RSC Login');
            const client = new net.Socket();
            this.client = client;
            this.sessionIdReceived = false;
            this.accumulatedData = Buffer.alloc(0);

            client.connect(this.port, this.host, () => {
                this.logger.info('Connected to RSC Server, waiting for Session ID');
            });

            client.on('data', (data) => {
                this.handleIncomingData(data, username, password, resolve);
            });

            client.on('error', (err) => {
                this.logger.error({ err }, 'RSC Connection Error');
                client.destroy();
                this.client = null;
                resolve({ ok: false, error: err });
            });

            client.on('close', () => {
                this.logger.info('RSC Connection Closed');
                this.client = null;
                this.loggedIn = false;
            });

            setTimeout(() => {
                if (this.client && !this.loggedIn) {
                    this.logger.warn('Login timed out');
                    client.destroy();
                    this.client = null;
                    resolve({ ok: false, error: new Error('Login timed out') });
                }
            }, 15000);
        });
    }

    private handleIncomingData(data: Buffer, username: string, password: string, resolve: (val: Result<Execution>) => void) {
        this.accumulatedData = Buffer.concat([this.accumulatedData, data]);

        if (!this.sessionIdReceived) {
            if (this.accumulatedData.length >= 4) {
                this.sessionIdReceived = true;
                const sessionIdData = this.accumulatedData.slice(0, this.accumulatedData.length >= 8 ? 8 : 4);
                this.accumulatedData = this.accumulatedData.slice(sessionIdData.length);

                this.logger.info({ sessionIdHex: sessionIdData.toString('hex') }, 'Session ID arrived, sending login');
                this.sendLoginPacket(username, password);
            }
            return;
        }

        if (!this.loggedIn) {
            if (this.accumulatedData.length >= 1) {
                const responseCode = this.accumulatedData.readUInt8(0);
                this.accumulatedData = this.accumulatedData.slice(1);
                this.logger.info({ responseCode }, 'Received login response');

                if (responseCode === 0 || responseCode === 64) {
                    this.loggedIn = true;
                    this.logger.info('Login successful, agreeing to chat rules');
                    this.sendCommand('::i_have_read_and_agree_to_the_global_chat_rules');

                    resolve({
                        ok: true,
                        value: {
                            output: `Successfully logged in as ${username}. Perception stream active.`,
                            data: { status: 'success', username, responseCode }
                        }
                    });
                } else {
                    this.logger.warn({ responseCode }, 'Login failed');
                    this.client?.destroy();
                    resolve({
                        ok: true,
                        value: {
                            output: `RSC Login failed with response code: ${responseCode}`,
                            data: { status: 'failure', responseCode }
                        }
                    });
                }
            }
            return;
        }

        // Handle framed packets (2-byte length BE)
        while (this.accumulatedData.length >= 2) {
            const len = this.accumulatedData.readUInt16BE(0);
            if (this.accumulatedData.length < 2 + len) break;

            const packet = this.accumulatedData.slice(2, 2 + len);
            this.accumulatedData = this.accumulatedData.slice(2 + len);

            const opcode = packet.readUInt8(0);
            const payload = packet.slice(1);
            this.handlePacket(opcode, payload);
        }
    }

    private handlePacket(opcode: number, payload: Buffer) {
        // this.logger.info({ opcode, len: payload.length }, 'Incoming Packet');

        switch (opcode) {
            case 255: // SEND_PLAYER_COORDS
                this.parsePlayerCoords(payload);
                break;
            case 248: // SEND_NPC_COORDS
                this.parseNPCCoords(payload);
                break;
            case 253: // SEND_SCENERY_HANDLER
                this.parseScenery(payload);
                break;
            case 231: // SEND_REMOVE_WORLD_NPC
                this.removeEntities(payload, 'npc');
                break;
            case 232: // SEND_REMOVE_WORLD_PLAYER
                this.removeEntities(payload, 'player');
                break;
            case 8: // SEND_SERVER_MESSAGE
                this.logger.info({ msg: payload.toString('utf8') }, 'Server Message');
                break;
        }
    }

    private parsePlayerCoords(payload: Buffer) {
        let offset = 0;
        this.state.player.index = payload.readInt16BE(offset); offset += 2;
        this.state.player.x = payload.readInt16BE(offset); offset += 2;
        this.state.player.y = payload.readInt16BE(offset); offset += 2;
        this.state.player.sprite = payload.readUInt8(offset); offset += 1;

        // Parse other players
        while (offset + 3 <= payload.length) {
            const packed = payload.readInt16BE(offset); offset += 2;
            const packed2 = payload.readUInt8(offset); offset += 1;

            const index = (packed >> 6) & 0x3FF;
            const offsetX = (packed >> 1) & 0x1F;
            const offsetYMsb = packed & 0x1;
            const offsetY = (offsetYMsb << 4) | ((packed2 >> 4) & 0xF);
            const sprite = packed2 & 0xF;

            // X and Y are relative (5-bit signed-ish? Actually 0-31 relative to player)
            // Wait, GameStateUpdater says DataConversions.getMobPositionOffsets.
            // These are relative offsets from player location. 
            // In OpenRSC, they are often (mobX - playerX).

            const realX = this.state.player.x + (offsetX > 16 ? offsetX - 32 : offsetX);
            const realY = this.state.player.y + (offsetY > 16 ? offsetY - 32 : offsetY);

            this.state.players.set(index, { index, x: realX, y: realY, sprite });
        }
    }

    private parseNPCCoords(payload: Buffer) {
        let offset = 0;
        while (offset + 4 <= payload.length) {
            const packed = payload.readInt16BE(offset); offset += 2;
            const packed2 = payload.readUInt8(offset); offset += 1;
            const id = payload.readUInt8(offset); offset += 1;

            const index = (packed >> 6) & 0x3FF;
            const offsetX = (packed >> 1) & 0x1F;
            const offsetYMsb = packed & 0x1;
            const offsetY = (offsetYMsb << 4) | ((packed2 >> 4) & 0xF);
            const sprite = packed2 & 0xF;

            const realX = this.state.player.x + (offsetX > 16 ? offsetX - 32 : offsetX);
            const realY = this.state.player.y + (offsetY > 16 ? offsetY - 32 : offsetY);

            this.state.npcs.set(index, { id, index, x: realX, y: realY, sprite });
        }
    }

    private parseScenery(payload: Buffer) {
        let offset = 0;
        const newObjects: GameObject[] = [];
        while (offset + 4 <= payload.length) {
            const id = payload.readUInt16BE(offset); offset += 2;
            const x = payload.readUInt8(offset); offset += 1;
            const y = payload.readUInt8(offset); offset += 1;
            newObjects.push({ id, x, y });
        }
        this.state.objects = newObjects;
    }

    private removeEntities(payload: Buffer, type: 'npc' | 'player') {
        let offset = 0;
        while (offset + 2 <= payload.length) {
            const index = payload.readUInt16BE(offset); offset += 2;
            if (type === 'npc') this.state.npcs.delete(index);
            else this.state.players.delete(index);
        }
    }

    private sendLoginPacket(username: string, password: string) {
        const usernameBuf = Buffer.from(username + '\n', 'utf8');
        const passwordBuf = Buffer.from(password + '\n', 'utf8');

        // Client Limitations block
        const limBuf = Buffer.alloc(2 + 4 + 4 + 4 + 2 + 2 + 1 + 2 + 2 + 2 + 4 + 1 + 2 + 4 + 4 + 4 + 2 + 4 + 1 + 1 + 4);
        let offset = 0;
        limBuf.writeUInt16BE(1000, offset); offset += 2; // maxAnimationId
        limBuf.writeUInt32BE(2000, offset); offset += 4; // maxItemId
        limBuf.writeUInt32BE(1000, offset); offset += 4; // maxNpcId
        limBuf.writeUInt32BE(1000, offset); offset += 4; // maxSceneryId
        limBuf.writeUInt16BE(100, offset); offset += 2;  // maxPrayerId
        limBuf.writeUInt16BE(100, offset); offset += 2;  // maxSpellId
        limBuf.writeUInt8(25, offset); offset += 1;      // maxSkillId
        limBuf.writeUInt16BE(100, offset); offset += 2;  // maxRoofId
        limBuf.writeUInt16BE(100, offset); offset += 2;  // maxTextureId
        limBuf.writeUInt16BE(100, offset); offset += 2;  // maxTileId
        limBuf.writeUInt32BE(1000, offset); offset += 4; // maxBoundaryId
        limBuf.writeUInt8(10, offset); offset += 1;      // maxTeleBubbleId
        limBuf.writeUInt16BE(50, offset); offset += 2;   // maxProjectileSprite
        limBuf.writeUInt32BE(10, offset); offset += 4;   // maxSkinColor
        limBuf.writeUInt32BE(10, offset); offset += 4;   // maxHairColor
        limBuf.writeUInt32BE(10, offset); offset += 4;   // maxClothingColor
        limBuf.writeUInt16BE(100, offset); offset += 2;  // maxQuestId
        limBuf.writeUInt32BE(100, offset); offset += 4;  // numberOfSounds
        limBuf.writeUInt8(1, offset); offset += 1;       // supportsModSprites
        limBuf.writeUInt8(5, offset); offset += 1;       // maxDialogueOptions
        limBuf.writeUInt32BE(1000, offset); offset += 4; // maxBankItems

        const payload = Buffer.concat([
            Buffer.from([0]),
            Buffer.from([0, 0, 39, 16]), // 10000
            usernameBuf,
            passwordBuf,
            Buffer.alloc(8, 0), // UID
            limBuf,
            Buffer.from('default_map\n', 'utf8'),
            Buffer.from([0]) // isAndroid
        ]);

        const totalLen = payload.length + 1;
        const packet = Buffer.alloc(2 + totalLen);
        packet.writeUInt16BE(totalLen, 0);
        packet.writeUInt8(0, 2);
        payload.copy(packet, 3);

        this.client?.write(packet);
    }

    private async chat(message: string): Promise<Result<Execution>> {
        if (!this.client || !this.loggedIn) {
            return {
                ok: true,
                value: {
                    output: 'AI is not logged into RSC. Use rsc_login first.',
                    data: { status: 'error', error: 'not_logged_in' }
                }
            };
        }

        this.logger.info({ message }, 'Sending RSC Global Chat Message');
        this.sendCommand(`::say ${message}`);

        return {
            ok: true,
            value: {
                output: `Sent RSC chat message: ${message}`,
                data: { status: 'success', message }
            }
        };
    }

    private sendCommand(command: string): void {
        if (!this.client) return;

        const cmdBuf = Buffer.from(command + '\n', 'utf8');
        const totalLen = cmdBuf.length + 1;
        const packet = Buffer.alloc(2 + totalLen);
        packet.writeUInt16BE(totalLen, 0);
        packet.writeUInt8(3, 2);
        cmdBuf.copy(packet, 3);

        this.client.write(packet);
    }

    override async close(): Promise<void> {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
    }
}
