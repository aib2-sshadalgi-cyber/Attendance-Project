const { Pool } = require('pg');

let cached = global.pgPool;

if (!cached) {
  cached = global.pgPool = { pool: null };
}

function getPool() {
  if (cached.pool) {
    return cached.pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  cached.pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX) || 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return cached.pool;
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function connectDb() {
  const pool = getPool();
  await pool.query('select 1');
  return pool;
}

module.exports = { connectDb, getPool, query };
