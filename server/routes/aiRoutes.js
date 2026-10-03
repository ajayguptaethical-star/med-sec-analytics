const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { processAiQuery, detectEmergency } = require('../services/aiService');

// 1. Process Symptom / Health AI Query
router.post('/query', authenticateToken, aiRateLimiter, async (req, res) => {
  const { queryText } = req.body;

  if (!queryText || queryText.trim() === '') {
    return res.status(400).json({ error: 'Query text cannot be empty.' });
  }

  try {
    const aiResult = await processAiQuery(queryText, req.user.role);

    // Save to AI chat history
    db.run(
      `INSERT INTO ai_chats (user_id, query, response) VALUES (?, ?, ?)`,
      [req.user.id, queryText, aiResult.answer],
      function (err) {
        if (err) {
          console.error('[AI CHATS DB ERROR]', err.message);
        }
        const chatId = this ? this.lastID : Date.now();

        return res.json({
          chatId,
          isEmergency: aiResult.isEmergency,
          emergencyMessage: aiResult.emergencyMessage,
          answer: aiResult.answer
        });
      }
    );
  } catch (err) {
    console.error('[AI QUERY ROUTE ERROR]', err);
    res.status(500).json({ error: err.message || 'Internal AI service error.' });
  }
});

// 2. Submit Thumbs Up / Thumbs Down Feedback for AI Response (Doctor & User)
router.post('/feedback', authenticateToken, (req, res) => {
  const { chatId, rating, comment } = req.body; // rating: 1 or -1

  if (!chatId || !rating) {
    return res.status(400).json({ error: 'Chat ID and rating (1 or -1) are required.' });
  }

  db.run(
    'UPDATE ai_chats SET feedback = ?, feedback_comment = ? WHERE id = ? AND user_id = ?',
    [rating, comment || '', chatId, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Feedback recorded successfully. Thank you!' });
    }
  );
});

// 3. Get AI Chat History for Current User / Doctor
router.get('/history', authenticateToken, (req, res) => {
  db.all('SELECT * FROM ai_chats WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 4. Delete ALL AI Chat History Entries for Current User / Doctor (Static path MUST be before :id)
router.delete('/history', authenticateToken, (req, res) => {
  db.run('DELETE FROM ai_chats WHERE user_id = ?', [req.user.id], function (err) {
    if (err) {
      console.error('[CLEAR ALL AI CHATS ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'All AI chat history cleared successfully.' });
  });
});

// 5. Delete Single AI Chat History Entry
router.delete('/history/:id', authenticateToken, (req, res) => {
  const rawId = req.params.id;
  if (!rawId || rawId === 'undefined' || rawId === 'null') {
    return res.json({ message: 'Temporary chat item removed.' });
  }

  const numId = parseInt(rawId, 10);
  const targetId = isNaN(numId) ? rawId : numId;

  db.run('DELETE FROM ai_chats WHERE (id = ? OR id = ?) AND user_id = ?', [rawId, targetId, req.user.id], function (err) {
    if (err) {
      console.error('[DELETE AI CHAT ERROR]', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'AI chat history entry deleted successfully.', deletedId: rawId });
  });
});

module.exports = router;
