/**
 * Vercel serverless entry: connects MongoDB once per warm instance, then serves Express app.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { connectDb } = require('../backend/src/config/db');
const { createApp } = require('../backend/src/app');

const app = createApp();

module.exports = async (req, res) => {
  await connectDb();
  return app(req, res);
};
