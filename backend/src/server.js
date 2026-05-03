require('dotenv').config();
const { createApp } = require('./app');
const { connectDb } = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = main;
