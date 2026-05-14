const { query } = require('../config/db');

async function findByEmail(email) {
  const { rows } = await query(
    `SELECT id, email, password_hash AS "passwordHash", role
     FROM users WHERE lower(trim(email)) = lower(trim($1))`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT id, email, password_hash AS "passwordHash", role FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByIdPublic(id) {
  const { rows } = await query(`SELECT id, email, role FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createUser({ email, passwordHash, role }, client = null) {
  const run = client ? (t, p) => client.query(t, p) : query;
  const { rows } = await run(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
     RETURNING id, email, password_hash AS "passwordHash", role`,
    [email, passwordHash, role]
  );
  return rows[0];
}

async function updatePassword(userId, passwordHash) {
  await query(`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, [
    userId,
    passwordHash,
  ]);
}

async function deleteById(userId) {
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
}

module.exports = {
  findByEmail,
  findById,
  findByIdPublic,
  createUser,
  updatePassword,
  deleteById,
};
