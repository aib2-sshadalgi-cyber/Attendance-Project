const { Pool } = require('pg');

let cached = global.pgPool;

if (!cached) {
  cached = global.pgPool = { pool: null };
}

function getPool() {
  if (cached.pool) {
    return cached.pool;
  }

  const rawConnectionString = process.env.DATABASE_URL;
  let connectionString = rawConnectionString;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Keep TLS behavior controlled by pg Pool config to avoid SSL mode parsing differences.
  try {
    const parsed = new URL(connectionString);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('ssl');
    connectionString = parsed.toString();
  } catch {
    connectionString = rawConnectionString;
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

async function withTransaction(fn) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { connectDb, getPool, query, withTransaction };
