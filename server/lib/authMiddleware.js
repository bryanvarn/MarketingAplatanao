const { verify } = require('./session');

function requireAdmin(req, res, next) {
  if (verify(req.cookies && req.cookies.ma_session)) return next();
  res.status(401).json({ error: 'No autenticado.' });
}

module.exports = { requireAdmin };
