const { prepare } = require('../database');

module.exports = {
  isAuthenticated(req, res, next) {
    if (req.sessionId) return next();
    res.redirect('/auth/login');
  },

  isAdmin(req, res, next) {
    if (req.sessionId && req.sessionRole === 'admin') return next();
    res.status(403).send('Akses ditolak. Hanya untuk admin.');
  },

  isActive(req, res, next) {
    const user = prepare('SELECT status FROM users WHERE id = ?').get(req.sessionId);
    if (user && user.status === 'aktif') return next();
    res.status(403).send('Akun Anda belum aktif. Silakan tunggu verifikasi.');
  }
};
