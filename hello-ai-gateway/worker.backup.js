// Polyfill for Node.js compat
const util = require('util');
if (!globalThis.TextDecoder) globalThis.TextDecoder = util.TextDecoder;
if (!globalThis.TextEncoder) globalThis.TextEncoder = util.TextEncoder;

/**
 * RSC Zero-Cost Router
 * 
 * Handles:
 * 1. Geo-routing to Durable Object Shards (Americas/Europe/Asia/Oceania)
 * 2. Asset serving with fallback (R2 -> KV)
 * 3. Feature Flag Enforcement
 */

// CJS Imports
const { RSCServerDO } = require('./durable-objects/RSCServerDO.js');
const { PlayerDO } = require('./durable-objects/PlayerDO.js');
const { processQueue } = require('./worker-queue.js');
const { handleAI } = require('./ai-handler.js');

// Default new player data - must match data-client.js
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

async function fetch(request, env, ctx) {
    const url = new URL(request.url);

    // --- CVS PREFLIGHT (CORS) ---
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }

    // --- AI GATEWAY INTERCEPTION ---
    // Intercept root POST requests or /ai/* for AI capabilities
    if (request.method === 'POST' && (url.pathname === '/' || url.pathname.startsWith('/ai/'))) {
        return await handleAI(request, env);
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // --- 1. HEALTH CHECKS & ADMIN ---
    if (url.pathname === '/health') {
        return new Response('RSC Zero-Cost Router Online', { status: 200, headers: corsHeaders });
    }

    // --- 2. UNIFIED AUTH API & STATUS ---
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

    // --- 3. ASSET SERVING (R2 -> KV Fallback) ---
    if (url.pathname.startsWith('/asset/')) {
        return await handleAsset(request, env, url);
    }

    // --- 4. STATIC ASSETS (Serve from ./public) ---
    // For non-WebSocket requests, try to serve from ASSETS binding first
    if (request.headers.get('Upgrade') !== 'websocket') {
        // Check if ASSETS binding exists and try to serve the file
        // Note: feature toggled off in code earlier but logic remains
        if (env.ASSETS) {
            try {
                const assetResponse = await env.ASSETS.fetch(request);
                // If we got a valid response (not 404), return it
                if (assetResponse.status !== 404) {
                    return assetResponse;
                }
            } catch (e) {
                // Asset not found, continue to API/DO routing
            }
        }
    }

    // --- 5. REGIONAL GAME SHARDING ---
    // Route WebSocket/API traffic to the nearest regional Durable Object
    const country = request.cf?.country || 'US';
    const shardMapping = env.SHARD_MAPPING ? JSON.parse(env.SHARD_MAPPING) : {};

    // Default to Americas if no mapping found
    const shardBindingName = shardMapping[country] || 'DO_AMERICAS';
    const doBinding = env[shardBindingName];

    if (!doBinding) {
        return new Response(`Configuration Error: Region ${shardBindingName} not found`, { status: 500, headers: corsHeaders });
    }

    // Use a stable ID for the region (singleton per region)
    const id = doBinding.idFromName(shardBindingName);
    const stub = doBinding.get(id);

    // **WebSocket Upgrade**: Forward WebSocket connections directly to Durable Object
    if (request.headers.get('Upgrade') === 'websocket') {
        return stub.fetch(request);
    }

    // For non-WebSocket requests that weren't handled by assets, forward to DO
    return stub.fetch(request);
}

async function queue(batch, env, ctx) {
    await processQueue(batch, env);
}

/**
 * Handles Unified Register API
 */
async function handleRegister(request, env, corsHeaders) {
    try {
        const { username, password } = await request.json();
        if (!username || !password || username.length < 2 || password.length < 2) {
            return new Response(JSON.stringify({ success: false, error: 'Invalid credentials' }), { status: 400, headers: corsHeaders });
        }
        const cleanUser = username.toLowerCase();

        // Check DB (DB preferred, fallback KV)
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

        // Create Player
        const newPlayer = JSON.parse(JSON.stringify(DEFAULT_PLAYER));
        newPlayer.username = cleanUser;
        newPlayer.password = password; // In real prod, hash this! keeping plain for RSC legacy match
        newPlayer.loginDate = Date.now();

        // Save
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

/**
 * Handles Unified Login API
 */
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

        // Success - return basic session info
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

    const max = Math.max(melee, range, magic);
    return Math.floor(base + max);
}

async function handleStatus(request, env, corsHeaders) {
    try {
        // Fetch from DO (Americas default)
        const shardMapping = env.SHARD_MAPPING ? JSON.parse(env.SHARD_MAPPING) : {};
        const country = request.cf?.country || 'US';
        const shardBindingName = shardMapping[country] || 'DO_AMERICAS';
        const doBinding = env[shardBindingName];

        if (!doBinding) return new Response(JSON.stringify({ players: 0, status: 'Offline' }), { headers: corsHeaders });

        const id = doBinding.idFromName(shardBindingName);
        const stub = doBinding.get(id);

        // Call the DO's /status endpoint
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

        // 1. Fetch Raw Data (Limit 50 to avoid memory limit)
        if (env.DB) {
            const { results } = await env.DB.prepare('SELECT username, data FROM players ORDER BY updated_at DESC LIMIT 50').all();
            players = results.map(r => {
                const p = JSON.parse(r.data);
                return { username: r.username, skills: p.skills, group: p.group };
            });
        } else if (env.KV_BINDING || env.KV) {
            // KV Listing is slow/limited, return empty for now or use List
            // Skipping detailed KV highscores for prototype speed
        }

        // 2. Calculate Totals
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

        // 3. Sort
        leaders.sort((a, b) => b.totalLevel - a.totalLevel || b.totalXp - a.totalXp); // Descending

        return new Response(JSON.stringify(leaders.slice(0, 10)), { headers: corsHeaders });

    } catch (e) {
        return new Response(JSON.stringify([]), { headers: corsHeaders });
    }
}

/**
 * Handles asset serving with cost-saving fallback logic
 * Protocol: Check R2 (if enabled) -> Check KV -> 404
 */
async function handleAsset(request, env, url) {
    const path = url.pathname.slice(7); // remove "/asset/"

    // A. R2 Storage (Sponsor Tier > $5/mo)
    if (env.FEATURE_R2_ASSETS === 'true' && env.RSC_ASSETS) {
        try {
            const r2Object = await env.RSC_ASSETS.get(path);
            if (r2Object) {
                const headers = new Headers();
                r2Object.writeHttpMetadata(headers);
                headers.set('etag', r2Object.httpEtag);
                // Aggressive caching for assets (save bandwidth)
                headers.set('Cache-Control', 'public, max-age=31536000, immutable');

                return new Response(r2Object.body, { headers });
            }
        } catch (e) {
            console.error('R2 Error:', e);
        }
    }

    // B. KV Storage (Free Tier Fallback)
    // Assets stored as base64 or raw strings in KV
    // Key format: "asset:sprites/man.png"
    if (env.KV) {
        const kvAsset = await env.KV.get(`asset:${path}`, { type: 'stream' });
        if (kvAsset) {
            return new Response(kvAsset, {
                headers: {
                    'Content-Type': getContentType(path),
                    'Cache-Control': 'public, max-age=86400' // 1 day cache for KV
                }
            });
        }
    }

    return new Response('Asset Not Found', { status: 404 });
}

function getContentType(path) {
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.json')) return 'application/json';
    if (path.endsWith('.glb')) return 'model/gltf-binary';
    return 'application/octet-stream';
}

// Final Export
module.exports = {
    RSCServerDO,
    PlayerDO,
    fetch,
    queue
};
