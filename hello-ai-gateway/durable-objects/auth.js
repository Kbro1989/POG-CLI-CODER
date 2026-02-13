
/**
 * AuthService - Handles Player Authentication & Persistence
 * Supports both D1 (SQL) and KV (NoSQL) backends
 */
class AuthService {
    constructor(env) {
        this.env = env;
    }

    /**
     * Create a new user
     * @param {string} username 
     * @param {string} password 
     */
    async createUser(username, password) {
        const cleanUser = username.toLowerCase();

        // Check if user exists
        let exists = false;
        if (this.env.DB) {
            const res = await this.env.DB.prepare('SELECT 1 FROM players WHERE username = ?').bind(cleanUser).first();
            exists = !!res;
        } else if (this.env.KV_BINDING) {
            exists = await this.env.KV_BINDING.get(`player:${cleanUser}`) !== null;
        }

        if (exists) {
            throw new Error('Username taken');
        }

        // Default Player Template
        const newPlayer = {
            username: cleanUser,
            password: password,
            group: 0,
            x: 213, y: 436, // Edgeville
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
            loginDate: Date.now()
        };

        // Save
        if (this.env.DB) {
            await this.env.DB.prepare('INSERT INTO players (username, data, updated_at) VALUES (?, ?, ?)')
                .bind(cleanUser, JSON.stringify(newPlayer), Date.now()).run();
        } else if (this.env.KV_BINDING) {
            await this.env.KV_BINDING.put(`player:${cleanUser}`, JSON.stringify(newPlayer));
        }

        return newPlayer;
    }

    /**
     * Authenticate a user
     * @param {string} username 
     * @param {string} password 
     */
    async login(username, password) {
        const cleanUser = username.toLowerCase();
        let data = null;

        if (this.env.DB) {
            const res = await this.env.DB.prepare('SELECT data FROM players WHERE username = ?').bind(cleanUser).first();
            if (res) data = JSON.parse(res.data);
        } else if (this.env.KV_BINDING) {
            data = await this.env.KV_BINDING.get(`player:${cleanUser}`, { type: 'json' });
        }

        if (!data) {
            throw new Error('User not found');
        }

        // Check password (direct compare for legacy RSC, hash in prod)
        if (data.password !== password && data.pass !== password) {
            throw new Error('Invalid password');
        }

        return { username: cleanUser, playerData: data };
    }

    /**
     * Save player state
     * @param {string} username 
     * @param {object} playerData 
     */
    async savePlayerData(username, playerData) {
        const cleanUser = username.toLowerCase();

        if (this.env.DB) {
            await this.env.DB.prepare('UPDATE players SET data = ?, updated_at = ? WHERE username = ?')
                .bind(JSON.stringify(playerData), Date.now(), cleanUser).run();
        } else if (this.env.KV_BINDING) {
            await this.env.KV_BINDING.put(`player:${cleanUser}`, JSON.stringify(playerData));
        }
    }
}
module.exports = { AuthService };
