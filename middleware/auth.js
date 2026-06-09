module.exports = {
  isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/auth/login');
  },

  isAdmin(req, res, next) {
    if (req.session.userId && req.session.role === 'admin') return next();
    res.status(403).send('Akses ditolak. Hanya untuk admin.');
  },

  isActive(req, res, next) {
    const db = require('../database');
    const user = db.prepare('SELECT status FROM users WHERE id = ?').get(req.session.userId);
    if (user && user.status === 'aktif') return next();
    res.status(403).send('Akun Anda belum aktif. Silakan tunggu verifikasi.');
  }
};
