const mysql = require('mysql2/promise');

let pool = null;

function getPool() {
  if (!process.env.DB_HOST) return null;
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

async function initDb() {
  const p = getPool();
  if (!p) {
    console.warn('بيانات قاعدة البيانات غير مضبوطة - سيعمل بنك الأسئلة في الذاكرة فقط ولن يُحفظ.');
    return;
  }
  try {
    await p.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        text TEXT NOT NULL,
        type VARCHAR(10) NOT NULL DEFAULT 'group',
        answer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('تم تهيئة قاعدة بيانات MySQL بنجاح');
  } catch (e) {
    console.error('خطأ أثناء تهيئة قاعدة البيانات:', e.message);
    throw e;
  }
}

module.exports = { getPool, initDb };
