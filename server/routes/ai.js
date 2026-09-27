const express = require('express');
const { generateStrategy } = require('../lib/openai');
const { requireAdmin } = require('../lib/authMiddleware');

const router = express.Router();

router.post('/strategy', requireAdmin, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt || !String(prompt).trim()) return res.status(400).json({ error: 'Falta el prompt.' });
    const text = await generateStrategy(prompt);
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'Error generando la estrategia con IA.', code: e.code });
  }
});

module.exports = router;
