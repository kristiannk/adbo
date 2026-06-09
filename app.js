const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { initDb, prepare } = require('./database');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET = 'ticket-system-secret-key-2024';

function signCookie(value) {
  const data = JSON.stringify(value);
  const encoded = Buffer.from(data).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64').replace(/=+$/, '');
  return encoded + '.' + sig;
}

function unsignCookie(raw) {
  if (!raw || !raw.includes('.')) return null;
  const [encoded, sig] = raw.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('base64').replace(/=+$/, '');
  if (sig !== expected) return null;
  try { return JSON.parse(Buffer.from(encoded, 'base64').toString()); } catch { return null; }
}

function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').find(c => c.trim().startsWith('session='));
  if (!match) return {};
  return unsignCookie(match.split('=')[1]) || {};
}

function setSessionCookie(res, data) {
  const cookie = signCookie(data);
  res.setHeader('Set-Cookie', `session=${cookie}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
}

app.use((req, res, next) => {
  const sd = getSession(req);
  req.session = sd;
  req.sessionId = sd.userId || null;
  req.sessionRole = sd.role || null;

  res.locals.user = null;
  res.locals.isAdmin = false;
  res.locals.req = req;
  if (req.sessionId) {
    const user = prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(req.sessionId);
    res.locals.user = user;
    res.locals.isAdmin = user && user.role === 'admin';
  }
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/orders', require('./routes/orders'));
app.use('/payments', require('./routes/payments'));
app.use('/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  const events = prepare("SELECT * FROM events WHERE status = 'penjualan_tiket' ORDER BY date ASC").all();
  res.render('index', { events });
});

async function start() {
  await initDb();
  console.log('Database siap.');
}

if (require.main === module) {
  start().then(() => {
    app.listen(3000, () => console.log('Server berjalan di http://localhost:3000'));
  });
}

module.exports = { app, start };
