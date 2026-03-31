const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
// Menjadi ini (memanggil file spesifik):
const { MessageTemplate, AutoReply, MessageLog } = require('../models/MessageTemplate');
const { Op, Sequelize } = require('sequelize');

// ── TEMPLATES ────────────────────────────────────────────────────────────────

router.get('/templates', auth, async (req, res) => {
  try {
    const templates = await MessageTemplate.findAll({ 
      where: { user_id: req.user.id }, 
      order: [['created_at', 'DESC']] 
    });
    res.json({ success: true, data: templates });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/templates', auth, async (req, res) => {
  try {
    const { name, content, media_type, media_url, variables } = req.body;
    if (!name || !content) return res.status(400).json({ success: false, message: 'Name and content required' });
    const template = await MessageTemplate.create({ user_id: req.user.id, name, content, media_type, media_url, variables });
    res.status(201).json({ success: true, data: template });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/templates/:id', auth, async (req, res) => {
  try {
    const t = await MessageTemplate.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!t) return res.status(404).json({ success: false, message: 'Template not found' });
    await t.update(req.body);
    res.json({ success: true, data: t });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/templates/:id', auth, async (req, res) => {
  try {
    const t = await MessageTemplate.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!t) return res.status(404).json({ success: false, message: 'Template not found' });
    await t.destroy();
    res.json({ success: true, message: 'Template deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── AUTO REPLY ────────────────────────────────────────────────────────────────

router.get('/auto-reply', auth, async (req, res) => {
  try {
    const rules = await AutoReply.findAll({ 
      where: { user_id: req.user.id }, 
      order: [['created_at', 'DESC']] 
    });
    res.json({ success: true, data: rules });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/auto-reply', auth, async (req, res) => {
  try {
    const { session_id, trigger_keyword, match_type, reply_message, media_type, media_url } = req.body;
    if (!session_id || !trigger_keyword || !reply_message)
      return res.status(400).json({ success: false, message: 'Session, keyword and reply required' });
    const rule = await AutoReply.create({ user_id: req.user.id, session_id, trigger_keyword, match_type, reply_message, media_type, media_url });
    res.status(201).json({ success: true, data: rule });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/auto-reply/:id', auth, async (req, res) => {
  try {
    const rule = await AutoReply.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    await rule.update(req.body);
    res.json({ success: true, data: rule });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/auto-reply/:id', auth, async (req, res) => {
  try {
    const rule = await AutoReply.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
    await rule.destroy();
    res.json({ success: true, message: 'Rule deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── INBOX (MESSAGE LOGS) ──────────────────────────────────────────────────────

/**
 * Mendapatkan daftar percakapan terakhir (Sidebar Chat)
 */
router.get('/inbox/chats', auth, async (req, res) => {
  try {
    // Ambil semua pesan terbaru milik user yang login
    const logs = await MessageLog.sequelize.query(`
      SELECT ml.*, ws.session_name 
      FROM message_logs ml
      JOIN wa_sessions ws ON ml.session_id = ws.id
      WHERE ws.user_id = :userId
      ORDER BY ml.created_at DESC
      LIMIT 100
    `, {
      replacements: { userId: req.user.id },
      type: Sequelize.QueryTypes.SELECT
    });

    // Logic Sederhana: Buat daftar chat unik berdasarkan nomor di Javascript saja (lebih stabil)
    const uniqueChats = [];
    const map = new Map();
    for (const item of logs) {
      const phone = item.direction === 'incoming' ? item.from_number : item.to_number;
      if (!map.has(phone)) {
        map.set(phone, true);
        uniqueChats.push(item);
      }
    }

    res.json({ success: true, data: uniqueChats });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Mendapatkan riwayat chat lengkap dengan satu nomor
 */
router.get('/inbox/messages/:number', auth, async (req, res) => {
  try {
    const { number } = req.params;

    const messages = await MessageLog.findAll({
      include: [{
        model: WaSession,
        where: { user_id: req.user.id },
        attributes: ['session_name']
      }],
      where: {
        [Op.or]: [
          { from_number: number },
          { to_number: number }
        ]
      },
      order: [['created_at', 'ASC']]
    });

    // Otomatis tandai sebagai terbaca saat dibuka
    await MessageLog.update(
      { is_read: 1 },
      { 
        where: { 
          from_number: number, 
          direction: 'incoming', 
          is_read: 0 
        } 
      }
    );

    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Menghapus seluruh percakapan dengan satu nomor
 */
router.delete('/inbox/chats/:number', auth, async (req, res) => {
  try {
    const { number } = req.params;

    // Pastikan session yang dihapus lognya adalah milik user yang sedang login
    const userSessions = await WaSession.findAll({ 
      where: { user_id: req.user.id }, 
      attributes: ['id'] 
    });
    const sessionIds = userSessions.map(s => s.id);

    await MessageLog.destroy({
      where: {
        session_id: sessionIds,
        [Op.or]: [
          { from_number: number },
          { to_number: number }
        ]
      }
    });

    res.json({ success: true, message: 'Percakapan berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;