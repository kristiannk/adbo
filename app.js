const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./database');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'ticket-system-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.user = null;
  res.locals.isAdmin = false;
  res.locals.req = req;
  if (req.session.userId) {
    const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE id = ?').get(req.session.userId);
    res.locals.user = user;
    res.locals.isAdmin = user && user.role === 'admin';
  }
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use('/', require('./routes/auth'));
app.use('/events', require('./routes/events'));
app.use('/orders', require('./routes/orders'));
app.use('/payments', require('./routes/payments'));
app.use('/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  const events = db.prepare("SELECT * FROM events WHERE status = 'penjualan_tiket' ORDER BY date ASC").all();
  res.render('index', { events });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);

  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@tiket.com');
  if (!admin) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (email, password, name, role, status) VALUES (?, ?, ?, ?, ?)').run('admin@tiket.com', hash, 'Admin', 'admin', 'aktif');
    console.log('Akun admin created: admin@tiket.com / admin123');
  }
});
