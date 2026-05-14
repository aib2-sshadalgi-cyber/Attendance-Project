/**
 * Vercel serverless entry: connects Postgres (Supabase) per request, then serves Express app.
 */
const path = require('path');
const fs = require('fs');

const localEnvPath = path.join(__dirname, '../backend/.env');
if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
}

const { connectDb } = require('../backend/src/config/db');
const { createApp } = require('../backend/src/app');

const app = createApp();

module.exports = async (req, res) => {
  try {
    const url = req?.url || '';
    if (url === '/health' || url.startsWith('/health?')) {
      return app(req, res);
    }
    await connectDb();
    return app(req, res);
  } catch (error) {
    console.error('API bootstrap failed:', error);
    return res.status(500).json({ message: 'Server bootstrap failed' });
  }
};
