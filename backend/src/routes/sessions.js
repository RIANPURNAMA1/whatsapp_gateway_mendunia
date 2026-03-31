const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const WaSession = require('../models/WaSession');
const { createSession, disconnectSession, isSessionConnected } = require('../services/whatsappService');

// GET /api/sessions
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await WaSession.findAll({ where: { user_id: req.user.id }, order: [['created_at', 'DESC']] });
    res.json({ success: true, data: sessions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sessions - create new device
router.post('/', auth, async (req, res) => {
  try {
    const { session_name } = req.body;
    if (!session_name) return res.status(400).json({ success: false, message: 'Session name required' });

    const session = await WaSession.create({ user_id: req.user.id, session_name, status: 'disconnected' });
    res.status(201).json({ success: true, data: session });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sessions/:id/connect
router.post('/:id/connect', auth, async (req, res) => {
  try {
    const session = await WaSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const io = req.app.get('io');
    await createSession(session.id, req.user.id, io);
    res.json({ success: true, message: 'Connecting... Scan QR code' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sessions/:id/disconnect
router.post('/:id/disconnect', auth, async (req, res) => {
  try {
    const session = await WaSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    await disconnectSession(session.id);
    await session.update({ status: 'disconnected', qr_code: null, phone_number: null });
    res.json({ success: true, message: 'Disconnected' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/sessions/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const session = await WaSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    try { await disconnectSession(session.id); } catch (e) {}
    await session.destroy();
    res.json({ success: true, message: 'Session deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/sessions/:id/status
router.get('/:id/status', auth, async (req, res) => {
  try {
    const session = await WaSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const connected = await isSessionConnected(session.id);
    res.json({ success: true, connected, status: session.status, qr_code: session.qr_code });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/sessions/:id/send - send single message
router.post('/:id/send', auth, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ success: false, message: 'Phone and message required' });

    const session = await WaSession.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const { sendMessage } = require('../services/whatsappService');
    await sendMessage(session.id, phone, message);
    res.json({ success: true, message: 'Message sent' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
