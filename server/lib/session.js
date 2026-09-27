const crypto = require('crypto');

function secret() {
  return process.env.ADMIN_SESSION_SECRET || 'dev-only-secret-change-me';
}

function sign(value) {
  const sig = crypto.createHmac('sha256', secret()).update(value).digest('hex');
  return value + '.' + sig;
}

function verify(signed) {
  if (!signed || typeof signed !== 'string') return false;
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return false;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  if (expected.length !== signed.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signed));
}

module.exports = { sign, verify };
