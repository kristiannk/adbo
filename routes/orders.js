const express = require('express');
const { prepare } = require('../database');
const { isAuthenticated, isActive } = require('../middleware/auth');
const router = express.Router();

router.get('/', isAuthenticated, (req, res) => {
  const orders = prepare("SELECT o.*, e.title as event_title, e.date as event_date FROM orders o JOIN events e ON o.event_id = e.id WHERE o.user_id = ? ORDER BY o.created_at DESC").all(req.session.userId);
  res.render('orders/list', { orders });
});

router.get('/create/:eventId', isAuthenticated, isActive, (req, res) => {
  const event = prepare("SELECT * FROM events WHERE id = ? AND status = 'penjualan_tiket'").get(req.params.eventId);
  if (!event) return res.status(404).send('Event tidak tersedia.');
  res.render('orders/create', { event, error: null });
});

router.post('/create/:eventId', isAuthenticated, isActive, (req, res) => {
  const event = prepare("SELECT * FROM events WHERE id = ? AND status = 'penjualan_tiket'").get(req.params.eventId);
  if (!event) return res.status(404).send('Event tidak tersedia.');
  const quantity = parseInt(req.body.quantity) || 1;
  if (quantity < 1) return res.render('orders/create', { event, error: 'Jumlah tiket minimal 1.' });
  const soldRec = prepare("SELECT COALESCE(SUM(quantity),0) as total FROM orders WHERE event_id = ? AND status NOT IN ('draft_pesanan','dibatalkan')").get(event.id);
  const sold = soldRec ? soldRec.total : 0;
  if (sold + quantity > event.ticket_quota) return res.render('orders/create', { event, error: 'Kuota tiket tidak mencukupi.' });
  const totalPrice = quantity * event.ticket_price;
  const result = prepare('INSERT INTO orders (user_id, event_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?)').run(req.session.userId, event.id, quantity, totalPrice, 'draft_pesanan');
  res.redirect('/orders/' + result.lastInsertRowid);
});

router.get('/:id', isAuthenticated, (req, res) => {
  const isAdmin = req.session.role === 'admin';
  const order = prepare("SELECT o.*, e.title as event_title, e.date as event_date, e.location, e.poster_url FROM orders o JOIN events e ON o.event_id = e.id WHERE o.id = ? AND (o.user_id = ? OR ?)").get(req.params.id, req.session.userId, isAdmin ? 1 : 0);
  if (!order) return res.status(404).send('Pesanan tidak ditemukan.');
  const payment = prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id);
  const tickets = prepare('SELECT * FROM tickets WHERE order_id = ?').all(order.id);
  res.render('orders/detail', { order, payment, tickets });
});

router.post('/:id/checkout', isAuthenticated, (req, res) => {
  const order = prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?').get(req.params.id, req.session.userId, 'draft_pesanan');
  if (!order) return res.status(404).send('Pesanan tidak dapat diproses.');
  prepare("UPDATE orders SET status = 'menunggu_pembayaran', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  prepare('INSERT INTO payments (order_id, amount, status) VALUES (?, ?, ?)').run(req.params.id, order.total_price, 'menunggu_pembayaran');
  res.redirect('/orders/' + req.params.id);
});

router.post('/:id/cancel', isAuthenticated, (req, res) => {
  const order = prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status IN ('draft_pesanan','menunggu_pembayaran')").get(req.params.id, req.session.userId);
  if (!order) return res.status(404).send('Pesanan tidak dapat dibatalkan.');
  prepare("UPDATE orders SET status = 'dibatalkan', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  const payment = prepare('SELECT * FROM payments WHERE order_id = ?').get(order.id);
  if (payment) prepare("UPDATE payments SET status = 'gagal', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(req.params.id);
  res.redirect('/orders/' + req.params.id);
});

router.post('/:id/refund', isAuthenticated, (req, res) => {
  const order = prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'terkonfirmasi'").get(req.params.id, req.session.userId);
  if (!order) return res.status(404).send('Refund tidak dapat diajukan.');
  prepare("UPDATE orders SET status = 'refund_diajukan', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  prepare("UPDATE tickets SET status = 'refunded' WHERE order_id = ?").run(req.params.id);
  res.redirect('/orders/' + req.params.id);
});

module.exports = router;
