const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function initDb() {
  const p = getPool();
  if (!p) {
    console.warn('DATABASE_URL غير مضبوط - سيعمل بنك الأسئلة في الذاكرة فقط ولن يُحفظ.');
    return;
  }
  await p.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      type VARCHAR(10) NOT NULL DEFAULT 'group',
      answer TEXT,
      created_at TIMESTAMP DEFAULT now()
    );
  `);
}

module.exports = { getPool, initDb };
