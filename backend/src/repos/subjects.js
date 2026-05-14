const { query } = require('../config/db');

async function listAll() {
  const { rows } = await query(`SELECT id, name, code FROM subjects ORDER BY code ASC`);
  return rows;
}

async function findById(id) {
  const { rows } = await query(`SELECT id, name, code FROM subjects WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function createSubject({ name, code }) {
  const { rows } = await query(
    `INSERT INTO subjects (name, code) VALUES ($1, $2) RETURNING id, name, code`,
    [name, code]
  );
  return rows[0];
}

async function deleteById(id) {
  await query(`DELETE FROM subjects WHERE id = $1`, [id]);
}

module.exports = { listAll, findById, createSubject, deleteById };
