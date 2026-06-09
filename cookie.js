const crypto = require('crypto');
const SECRET = 'ticket-system-secret-key-2024';

function signCookie(value) {
  const data = JSON.stringify(value);
  const encoded = Buffer.from(data).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64').replace(/=+$/, '');
  return encoded + '.' + sig;
}

function setSessionCookie(res, data) {
  const cookie = signCookie(data);
  res.setHeader('Set-Cookie', `session=${cookie}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
}

module.exports = { setSessionCookie, clearSessionCookie };
