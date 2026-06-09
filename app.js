const express = require('express');
const session = require('cookie-session');
const path = require('path');
const { initDb, prepare } = require('./database');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name: 'session',
  secret: 'ticket-system-secret-key-2024',
  maxAge: 24 * 60 * 60 * 1000,
  httpOnly: true
}));

app.use((req, res, next) => {
  res.locals.user = null;
  res.locals.isAdmin = false;
  res.locals.req = req;
  if (req.session.userId) {
    const user = prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(req.session.userId);
    res.locals.user = user;
    res.locals.isAdmin = user && user.role === 'admin';
  }
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const authRouter = require('./routes/auth');
app.use(authRouter);
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
  const admin = prepare('SELECT * FROM users WHERE email = ?').get('admin@tiket.com');
  if (!admin) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    prepare('INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, ?)').run('admin@tiket.com', hash, 'Admin', 'admin', 'aktif');
    console.log('Akun admin created: admin@tiket.com / admin123');
  }
  console.log('Database siap.');
}

let started = false;
async function ensureStarted() {
  if (!started) { started = true; await start(); }
}

if (require.main === module) {
  start().then(() => {
    app.listen(3000, () => console.log('Server berjalan di http://localhost:3000'));
  });
}

module.exports = { app, ensureStarted };
