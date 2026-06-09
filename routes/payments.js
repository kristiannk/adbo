const express = require('express');
const { prepare } = require('../database');
const { isAuthenticated } = require('../middleware/auth');
const router = express.Router();

router.post('/process/:orderId', isAuthenticated, (req, res) => {
  const order = prepare('SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?').get(req.params.orderId, req.sessionId, 'menunggu_pembayaran');
  if (!order) return res.status(404).send('Pembayaran tidak dapat diproses.');

  prepare("UPDATE payments SET status = 'diproses_gateway', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(order.id);

  const success = Math.random() > 0.2;
  if (success) {
    prepare("UPDATE payments SET status = 'berhasil', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(order.id);
    prepare("UPDATE orders SET status = 'terkonfirmasi', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);

    const event = prepare('SELECT * FROM events WHERE id = ?').get(order.event_id);
    for (let i = 0; i < order.quantity; i++) {
      const qr = 'TICKET-' + order.id + '-' + i + '-' + Date.now();
      prepare('INSERT INTO tickets (order_id, event_id, user_id, qr_code, status) VALUES (?, ?, ?, ?, ?)').run(order.id, event.id, order.user_id, qr, 'aktif');
    }

    prepare("UPDATE payments SET status = 'notifikasi_terkirim', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(order.id);
    res.redirect('/orders/' + order.id + '?success=1');
  } else {
    prepare("UPDATE payments SET status = 'gagal', updated_at = CURRENT_TIMESTAMP WHERE order_id = ?").run(order.id);
    prepare("UPDATE orders SET status = 'dibatalkan', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(order.id);
    res.redirect('/orders/' + order.id + '?failed=1');
  }
});

module.exports = router;
