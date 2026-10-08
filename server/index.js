require('dotenv').config();
const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const { initDb } = require('./db');
const { registerSocketHandlers } = require('./socketHandlers');
const { listQuestions, addQuestion, deleteQuestion } = require('./questions');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));



app.get('/api/questions', async (req, res) => {
  try {
    const questions = await listQuestions();
    res.json(questions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/questions', async (req, res) => {
  try {
    const { text, type, answer } = req.body;
    if (!text) return res.status(400).json({ error: 'نص السؤال مطلوب' });
    const q = await addQuestion({ text, type: type === 'team' ? 'team' : 'group', answer: answer || null });
    res.json(q);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/questions/:id', async (req, res) => {
  try {
    await deleteQuestion(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

registerSocketHandlers(io);

const PORT = process.env.PORT || 3000;

initDb()
  .catch((e) => console.error('فشل تهيئة قاعدة البيانات:', e.message))
  .finally(() => {
    server.listen(PORT, () => {
      console.log(`الخادم يعمل على المنفذ ${PORT}`);
    });
  });
