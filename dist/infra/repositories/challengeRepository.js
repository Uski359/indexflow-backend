import { getPool } from '../db/postgres.js';
const CHALLENGE_FIELDS = `
  id,
  entry_id,
  challenger,
  reason,
  bond,
  status,
  opened_at
`;
function mapChallenge(row) {
    return {
        id: row.id,
        entryId: row.entry_id,
        challenger: row.challenger,
        reason: row.reason,
        bond: Number(row.bond),
        status: row.status,
        openedAt: new Date(row.opened_at).toISOString()
    };
}
function getClient() {
    return getPool();
}
export async function insertChallenge(challenge) {
    const client = getClient();
    const { rows } = await client.query(`
      INSERT INTO protocol_challenges (
        id,
        entry_id,
        challenger,
        reason,
        bond,
        status,
        opened_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
      RETURNING ${CHALLENGE_FIELDS}
    `, [
        challenge.id,
        challenge.entryId,
        challenge.challenger,
        challenge.reason,
        challenge.bond,
        challenge.status,
        challenge.openedAt
    ]);
    return mapChallenge(rows[0]);
}
export async function fetchChallenges() {
    const client = getClient();
    const { rows } = await client.query(`SELECT ${CHALLENGE_FIELDS} FROM protocol_challenges ORDER BY opened_at DESC`);
    return rows.map(mapChallenge);
}
