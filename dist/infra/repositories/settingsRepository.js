import { getPool } from '../db/postgres.js';
const SETTINGS_ID = 'protocol';
const DEFAULT_SETTINGS = {
    baseReward: 150,
    challengeBond: 500,
    validatorQuorum: 0.67,
    slashPercentage: 0.25,
    oracleUrl: 'https://oracle.indexflow.network',
    updatedAt: new Date(0).toISOString()
};
function mapSettings(row) {
    if (!row) {
        return DEFAULT_SETTINGS;
    }
    return {
        baseReward: Number(row.base_reward),
        challengeBond: Number(row.challenge_bond),
        validatorQuorum: Number(row.validator_quorum),
        slashPercentage: Number(row.slash_percentage),
        oracleUrl: row.oracle_url,
        updatedAt: row.updated_at.toISOString()
    };
}
async function ensureSettings(pool) {
    await pool.query(`
      INSERT INTO protocol_settings (
        id,
        base_reward,
        challenge_bond,
        validator_quorum,
        slash_percentage,
        oracle_url
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [
        SETTINGS_ID,
        DEFAULT_SETTINGS.baseReward,
        DEFAULT_SETTINGS.challengeBond,
        DEFAULT_SETTINGS.validatorQuorum,
        DEFAULT_SETTINGS.slashPercentage,
        DEFAULT_SETTINGS.oracleUrl
    ]);
}
export async function getAdminSettings() {
    const pool = getPool();
    await ensureSettings(pool);
    const { rows } = await pool.query(`SELECT * FROM protocol_settings WHERE id = $1`, [SETTINGS_ID]);
    return mapSettings(rows[0]);
}
export async function updateProtocolParameters(input) {
    const pool = getPool();
    await ensureSettings(pool);
    const { rows } = await pool.query(`
      INSERT INTO protocol_settings (
        id,
        base_reward,
        challenge_bond,
        validator_quorum,
        slash_percentage,
        oracle_url,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, (SELECT oracle_url FROM protocol_settings WHERE id = $1 LIMIT 1), NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        base_reward = EXCLUDED.base_reward,
        challenge_bond = EXCLUDED.challenge_bond,
        validator_quorum = EXCLUDED.validator_quorum,
        slash_percentage = EXCLUDED.slash_percentage,
        updated_at = NOW()
      RETURNING *
    `, [
        SETTINGS_ID,
        input.baseReward,
        input.challengeBond,
        input.validatorQuorum,
        input.slashPercentage
    ]);
    return mapSettings(rows[0]);
}
export async function updateOracleEndpoint(oracleUrl) {
    const pool = getPool();
    await ensureSettings(pool);
    const { rows } = await pool.query(`
      INSERT INTO protocol_settings (
        id,
        base_reward,
        challenge_bond,
        validator_quorum,
        slash_percentage,
        oracle_url,
        updated_at
      )
      VALUES (
        $1,
        (SELECT base_reward FROM protocol_settings WHERE id = $1 LIMIT 1),
        (SELECT challenge_bond FROM protocol_settings WHERE id = $1 LIMIT 1),
        (SELECT validator_quorum FROM protocol_settings WHERE id = $1 LIMIT 1),
        (SELECT slash_percentage FROM protocol_settings WHERE id = $1 LIMIT 1),
        $2,
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        oracle_url = EXCLUDED.oracle_url,
        updated_at = NOW()
      RETURNING *
    `, [SETTINGS_ID, oracleUrl]);
    return mapSettings(rows[0]);
}
