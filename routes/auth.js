const express = require('express');
const bcrypt = require('bcryptjs');
const { prepare } = require('../database');
const { setSessionCookie, clearSessionCookie } = require('../cookie');
const router = express.Router();

router.get('/auth/login', (req, res) => {
  res.render('auth/login', { error: null, registered: req.query.registered });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('auth/login', { error: 'Email atau password salah.', registered: null });
  }
  setSessionCookie(res, { userId: user.id, role: user.role });
  res.redirect('/');
});

router.get('/auth/register', (req, res) => {
  res.render('auth/register', { error: null });
});

router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.render('auth/register', { error: 'Semua field harus diisi.' });
  }
  const existing = prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.render('auth/register', { error: 'Email sudah terdaftar.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  prepare('INSERT INTO users (email, password, name, status) VALUES (?, ?, ?, ?)').run(email, hash, name, 'menunggu_verifikasi');
  res.redirect('/auth/login?registered=1');
});

router.get('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.redirect('/');
});

module.exports = router;
