const express = require('express');
const { sign, verify } = require('../lib/session');

const router = express.Router();

router.post('/login', (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD no está configurada en el servidor.' });
  }
  const { password } = req.body || {};
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Código incorrecto.' });
  }
  const token = sign('admin:' + Date.now() + ':' + Math.random().toString(36).slice(2));
  res.cookie('ma_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure || req.get('x-forwarded-proto') === 'https',
    maxAge: 1000 * 60 * 60 * 12,
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('ma_session');
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ authenticated: verify(req.cookies && req.cookies.ma_session) });
});

module.exports = router;
