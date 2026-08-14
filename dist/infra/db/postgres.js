import { Pool } from 'pg';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
let pool = null;
let overridePool = null;
export function setPool(externalPool) {
    overridePool = externalPool;
    pool = externalPool;
}
export async function closePool() {
    if (pool && !overridePool) {
        await pool.end();
    }
    pool = null;
    overridePool = null;
}
export function resetPool() {
    pool = null;
    overridePool = null;
}
export function getPool() {
    if (overridePool) {
        return overridePool;
    }
    if (!pool) {
        pool = new Pool({
            connectionString: config.postgresUrl,
            max: 10,
            idleTimeoutMillis: 30000
        });
        pool.on('error', (error) => {
            logger.error({ err: error }, 'Unexpected PostgreSQL error');
        });
    }
    return pool;
}
