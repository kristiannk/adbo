const express = require('express');
const { prepare } = require('../database');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const router = express.Router();

router.use(isAuthenticated, isAdmin);

router.get('/', (req, res) => {
  const stats = {
    users: prepare('SELECT COUNT(*) as count FROM users').get().count,
    events: prepare('SELECT COUNT(*) as count FROM events').get().count,
    orders: prepare('SELECT COUNT(*) as count FROM orders').get().count,
    revenue: prepare("SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE status = 'terkonfirmasi'").get().total
  };
  res.render('admin/index', { stats });
});

router.get('/users', (req, res) => {
  const users = prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  res.render('admin/users', { users });
});

router.post('/users/:id/verify', (req, res) => {
  prepare("UPDATE users SET status = 'aktif', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/users');
});

router.post('/users/:id/reject', (req, res) => {
  prepare("UPDATE users SET status = 'ditolak', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/users');
});

router.post('/users/:id/suspend', (req, res) => {
  prepare("UPDATE users SET status = 'disuspended', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/users');
});

router.post('/users/:id/activate', (req, res) => {
  prepare("UPDATE users SET status = 'aktif', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/users');
});

router.get('/events', (req, res) => {
  const events = prepare("SELECT e.*, u.name as organizer_name FROM events e JOIN users u ON e.organizer_id = u.id ORDER BY e.created_at DESC").all();
  res.render('admin/events', { events });
});

router.post('/events/:id/approve', (req, res) => {
  const event = prepare('SELECT * FROM events WHERE id = ? AND status = ?').get(req.params.id, 'menunggu_approval');
  if (event) prepare("UPDATE events SET status = 'disetujui', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.post('/events/:id/publish', (req, res) => {
  prepare("UPDATE events SET status = 'dipublikasikan', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.post('/events/:id/start-sales', (req, res) => {
  prepare("UPDATE events SET status = 'penjualan_tiket', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.post('/events/:id/start-event', (req, res) => {
  prepare("UPDATE events SET status = 'event_berlangsung', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.post('/events/:id/complete', (req, res) => {
  prepare("UPDATE events SET status = 'selesai', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.post('/events/:id/reject', (req, res) => {
  prepare("UPDATE events SET status = 'ditolak', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.post('/events/:id/cancel', (req, res) => {
  prepare("UPDATE events SET status = 'dibatalkan', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/events');
});

router.get('/orders', (req, res) => {
  const orders = prepare("SELECT o.*, u.name as user_name, e.title as event_title FROM orders o JOIN users u ON o.user_id = u.id JOIN events e ON o.event_id = e.id ORDER BY o.created_at DESC").all();
  res.render('admin/orders', { orders });
});

router.post('/orders/:id/approve-refund', (req, res) => {
  const order = prepare("SELECT * FROM orders WHERE id = ? AND status = 'refund_diajukan'").get(req.params.id);
  if (order) prepare("UPDATE orders SET status = 'refund_diproses', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/:id/complete-refund', (req, res) => {
  prepare("UPDATE orders SET status = 'refund_selesai', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/:id/reject-refund', (req, res) => {
  prepare("UPDATE orders SET status = 'dibatalkan', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  prepare("UPDATE tickets SET status = 'aktif' WHERE order_id = ?").run(req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/:id/checkin', (req, res) => {
  prepare("UPDATE orders SET status = 'checkin', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'terkonfirmasi'").run(req.params.id);
  prepare("UPDATE tickets SET status = 'digunakan' WHERE order_id = ?").run(req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/:id/complete-order', (req, res) => {
  prepare("UPDATE orders SET status = 'selesai', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'checkin'").run(req.params.id);
  res.redirect('/admin/orders');
});

module.exports = router;
