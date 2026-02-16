import pino from 'pino';

export const logger = pino({
    name: 'POG-CORE',
    level: process.env['VIBE_LOG_LEVEL'] || 'info',
    base: { hostname: 'POG-Substrate' }
});
