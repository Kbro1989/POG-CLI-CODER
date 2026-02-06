export default {
    async queue(batch, env) {
        console.log(`[Queue] Processing batch of ${batch.messages.length} player saves...`);

        for (const msg of batch.messages) {
            try {
                const { id, body } = msg; // id = username, body = { data: stringified }
                const username = id;
                const playerDataInfo = body.data;

                // Upsert into D1
                // We use ON CONFLICT to handle updates
                await env.DB.prepare(
                    `INSERT INTO players (username, password, data, last_login) 
                     VALUES (?, ?, ?, ?) 
                     ON CONFLICT(username) DO UPDATE SET 
                     data = excluded.data, 
                     last_login = excluded.last_login`
                ).bind(
                    username,
                    'placeholder_pass', // In real flow, we'd extract pass from JSON if needed, or query it
                    playerDataInfo,
                    Date.now()
                ).run();

                msg.ack();
            } catch (err) {
                console.error(`[Queue] Failed to save player ${msg.id}:`, err);
                msg.retry();
            }
        }
    }
};
