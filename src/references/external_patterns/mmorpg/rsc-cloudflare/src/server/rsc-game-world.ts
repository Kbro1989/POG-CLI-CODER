// RSC Game World Durable Object
// Uses PartyServer pattern from multiplayer-globe-template
// Handles: geo-tracking, game state, sleepword auth, anti-bot

import { routePartykitRequest, Server } from "partyserver";

// Player connection state
interface PlayerState {
    username: string;
    x: number;
    y: number;
    direction: number;
    appearance: number[];
    combat: number;
    // Geo info from Cloudflare
    geo: {
        ip: string;
        lat: number;
        lng: number;
        country: string;
        city: string;
        colo: string;
    };
    // Auth state
    authenticated: boolean;
    sleepwordIndex?: number;
}

// Message types
type IncomingMessage =
    | { type: 'auth'; sleepword: string }
    | { type: 'move'; x: number; y: number; direction: number }
    | { type: 'chat'; message: string }
    | { type: 'action'; action: string; target?: number };

type OutgoingMessage =
    | { type: 'sleepword'; imageUrl: string; index: number }
    | { type: 'auth-result'; success: boolean; message?: string }
    | { type: 'player-join'; player: { username: string; x: number; y: number } }
    | { type: 'player-leave'; username: string }
    | { type: 'player-move'; username: string; x: number; y: number; direction: number }
    | { type: 'chat'; username: string; message: string }
    | { type: 'world-state'; players: Array<{ username: string; x: number; y: number }> };

export class RSCGameWorld extends Server<PlayerState> {
    // Game tick interval (600ms like authentic RSC)
    private tickInterval?: ReturnType<typeof setInterval>;

    // Track authenticated players
    private players = new Map<string, { connId: string; state: PlayerState }>();

    onStart() {
        console.log('[RSCGameWorld] Starting game world...');
        // Start game tick
        this.tickInterval = setInterval(() => this.gameTick(), 600);
    }

    async onConnect(conn: any, ctx: any) {
        // Extract geo info from Cloudflare headers
        const cf = ctx.request?.cf || {};
        const ip = ctx.request?.headers?.get('cf-connecting-ip') || 'unknown';

        const geo = {
            ip,
            lat: parseFloat(cf.latitude as string) || 0,
            lng: parseFloat(cf.longitude as string) || 0,
            country: (cf.country as string) || 'unknown',
            city: (cf.city as string) || 'unknown',
            colo: (cf.colo as string) || 'unknown',
        };

        console.log(`[RSCGameWorld] New connection from ${geo.country}`);

        // Initialize connection state (not authenticated yet)
        conn.setState({
            username: '',
            x: 122, // Tutorial Island spawn
            y: 656,
            direction: 4,
            appearance: [],
            combat: 3,
            geo,
            authenticated: false,
        });

        // Send sleepword challenge
        const sleepwordIndex = Math.floor(Math.random() * 1000); // Random index
        conn.state.sleepwordIndex = sleepwordIndex;

        conn.send(JSON.stringify({
            type: 'sleepword',
            imageUrl: `/api/sleepword/${sleepwordIndex}`,
            index: sleepwordIndex,
        } as OutgoingMessage));
    }

    async onMessage(conn: any, message: string | ArrayBuffer) {
        const state = conn.state as PlayerState;
        const msgStr = typeof message === 'string' ? message : new TextDecoder().decode(message);

        try {
            const msg = JSON.parse(msgStr) as IncomingMessage;

            switch (msg.type) {
                case 'auth':
                    await this.handleAuth(conn, msg.sleepword);
                    break;

                case 'move':
                    if (!state.authenticated) return;
                    state.x = msg.x;
                    state.y = msg.y;
                    state.direction = msg.direction;
                    conn.setState(state);

                    // Broadcast movement to all other players
                    this.broadcast(JSON.stringify({
                        type: 'player-move',
                        username: state.username,
                        x: msg.x,
                        y: msg.y,
                        direction: msg.direction,
                    } as OutgoingMessage), [conn.id]);
                    break;

                case 'chat':
                    if (!state.authenticated) return;
                    this.broadcast(JSON.stringify({
                        type: 'chat',
                        username: state.username,
                        message: msg.message,
                    } as OutgoingMessage));
                    break;

                case 'action':
                    if (!state.authenticated) return;
                    // Handle game actions (combat, skilling, etc.)
                    await this.handleAction(conn, msg.action, msg.target);
                    break;
            }
        } catch (err) {
            console.error('[RSCGameWorld] Message parse error:', err);
        }
    }

    async onClose(conn: any) {
        const state = conn.state as PlayerState;

        if (state.authenticated && state.username) {
            console.log(`[RSCGameWorld] ${state.username} disconnected`);

            // Remove from players map
            this.players.delete(state.username);

            // Broadcast player left
            this.broadcast(JSON.stringify({
                type: 'player-leave',
                username: state.username,
            } as OutgoingMessage));

            // Save player data to D1 (TODO: implement)
            await this.savePlayer(state);
        }
    }

    onError(conn: any) {
        this.onClose(conn);
    }

    // --- Private Methods ---

    private async handleAuth(conn: any, sleepword: string) {
        const state = conn.state as PlayerState;

        // TODO: Validate sleepword against stored answer
        // For now, accept any non-empty word as valid
        if (!sleepword || sleepword.length < 3) {
            conn.send(JSON.stringify({
                type: 'auth-result',
                success: false,
                message: 'Invalid sleepword. Try again.',
            } as OutgoingMessage));
            return;
        }

        // Extract username from sleepword response (format: "username:word")
        const parts = sleepword.split(':');
        const username = parts[0]?.toLowerCase().trim();
        const word = parts[1]?.toLowerCase().trim();

        if (!username || !word) {
            conn.send(JSON.stringify({
                type: 'auth-result',
                success: false,
                message: 'Format: username:sleepword',
            } as OutgoingMessage));
            return;
        }

        // Check if username already connected
        if (this.players.has(username)) {
            conn.send(JSON.stringify({
                type: 'auth-result',
                success: false,
                message: 'Account already logged in.',
            } as OutgoingMessage));
            return;
        }

        // Mark as authenticated
        state.authenticated = true;
        state.username = username;
        conn.setState(state);

        // Add to players map
        this.players.set(username, { connId: conn.id, state });

        console.log(`[RSCGameWorld] ${username} authenticated`);

        // Send success
        conn.send(JSON.stringify({
            type: 'auth-result',
            success: true,
        } as OutgoingMessage));

        // Send current world state to new player
        const worldState: Array<{ username: string; x: number; y: number }> = [];
        this.players.forEach((p, name) => {
            if (name !== username) {
                worldState.push({ username: name, x: p.state.x, y: p.state.y });
            }
        });
        conn.send(JSON.stringify({
            type: 'world-state',
            players: worldState,
        } as OutgoingMessage));

        // Broadcast new player to others
        this.broadcast(JSON.stringify({
            type: 'player-join',
            player: { username, x: state.x, y: state.y },
        } as OutgoingMessage), [conn.id]);
    }

    private async handleAction(conn: any, action: string, target?: number) {
        // TODO: Implement game actions
        console.log(`[RSCGameWorld] Action: ${action}, target: ${target}`);
    }

    private async savePlayer(state: PlayerState) {
        // TODO: Save to D1
        console.log(`[RSCGameWorld] Saving ${state.username}...`);
    }

    private gameTick() {
        // Game tick logic (NPC movement, regen, timers, etc.)
        // Runs every 600ms like authentic RSC
    }
}

// Worker entry point
export default {
    async fetch(request: Request, env: any): Promise<Response> {
        // Route PartyServer requests
        const partyResponse = await routePartykitRequest(request, env);
        if (partyResponse) {
            return partyResponse;
        }

        // Fallback to 404
        return new Response('Not Found', { status: 404 });
    },
};
