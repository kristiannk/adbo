const express = require('express');
const { prepare } = require('../database');
const { isAuthenticated, isActive } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const events = prepare("SELECT e.*, u.name as organizer_name FROM events e JOIN users u ON e.organizer_id = u.id WHERE e.status IN ('penjualan_tiket', 'event_berlangsung') ORDER BY e.date ASC").all();
  res.render('events/list', { events });
});

router.get('/create', isAuthenticated, isActive, (req, res) => {
  res.render('events/create', { error: null });
});

router.post('/create', isAuthenticated, isActive, (req, res) => {
  const { title, description, date, location, ticket_price, ticket_quota } = req.body;
  if (!title || !date || !location) {
    return res.render('events/create', { error: 'Judul, tanggal, dan lokasi wajib diisi.' });
  }
  prepare('INSERT INTO events (organizer_id, title, description, date, location, ticket_price, ticket_quota, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(req.session.userId, title, description, date, location, parseFloat(ticket_price) || 0, parseInt(ticket_quota) || 0, 'draft');
  res.redirect('/events/mine');
});

router.get('/mine', isAuthenticated, (req, res) => {
  const events = prepare("SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC").all(req.session.userId);
  res.render('events/mine', { events });
});

router.get('/:id', (req, res) => {
  const event = prepare("SELECT e.*, u.name as organizer_name FROM events e JOIN users u ON e.organizer_id = u.id WHERE e.id = ?").get(req.params.id);
  if (!event) return res.status(404).send('Event tidak ditemukan.');
  const sold = prepare("SELECT COALESCE(SUM(quantity),0) as total FROM orders WHERE event_id = ? AND status NOT IN ('draft_pesanan','dibatalkan')").get(event.id);
  const ticketsLeft = event.ticket_quota - (sold ? sold.total : 0);
  res.render('events/detail', { event, ticketsLeft });
});

router.post('/:id/submit', isAuthenticated, (req, res) => {
  const event = prepare('SELECT * FROM events WHERE id = ? AND organizer_id = ?').get(req.params.id, req.session.userId);
  if (!event) return res.status(404).send('Event tidak ditemukan.');
  prepare("UPDATE events SET status = 'menunggu_approval', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.redirect('/events/mine');
});

router.post('/:id/edit', isAuthenticated, (req, res) => {
  const event = prepare('SELECT * FROM events WHERE id = ? AND organizer_id = ? AND status = ?').get(req.params.id, req.session.userId, 'draft');
  if (!event) return res.status(404).send('Event tidak dapat diedit.');
  const { title, description, date, location, ticket_price, ticket_quota } = req.body;
  prepare("UPDATE events SET title=?, description=?, date=?, location=?, ticket_price=?, ticket_quota=?, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(title, description, date, location, parseFloat(ticket_price) || 0, parseInt(ticket_quota) || 0, req.params.id);
  res.redirect('/events/mine');
});

router.post('/:id/reschedule', isAuthenticated, (req, res) => {
  const event = prepare('SELECT * FROM events WHERE id = ? AND organizer_id = ? AND status = ?').get(req.params.id, req.session.userId, 'dipublikasikan');
  if (!event) return res.status(404).send('Event tidak dapat dijadwalkan ulang.');
  const { date } = req.body;
  prepare("UPDATE events SET date=?, status='dijadwalkan_ulang', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(date, req.params.id);
  res.redirect('/events/mine');
});

module.exports = router;
