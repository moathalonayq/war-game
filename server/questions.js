const { getPool } = require('./db');

// مخزن احتياطي في الذاكرة يُستخدم إذا لم تتوفر قاعدة بيانات
let memId = 1;
const memQuestions = [];

async function listQuestions() {
  const p = getPool();
  if (p) {
    const [rows] = await p.query('SELECT * FROM questions ORDER BY created_at DESC');
    return rows;
  }
  return [...memQuestions].reverse();
}

async function addQuestion({ text, type, answer }) {
  const p = getPool();
  if (p) {
    const [result] = await p.query(
      'INSERT INTO questions (text, type, answer) VALUES (?, ?, ?)',
      [text, type, answer]
    );
    const [rows] = await p.query('SELECT * FROM questions WHERE id = ?', [result.insertId]);
    return rows[0];
  }
  const q = { id: memId++, text, type, answer, created_at: new Date() };
  memQuestions.push(q);
  return q;
}

async function deleteQuestion(id) {
  const p = getPool();
  if (p) {
    await p.query('DELETE FROM questions WHERE id = ?', [id]);
    return;
  }
  const idx = memQuestions.findIndex((q) => q.id === Number(id));
  if (idx !== -1) memQuestions.splice(idx, 1);
}

module.exports = { listQuestions, addQuestion, deleteQuestion };
