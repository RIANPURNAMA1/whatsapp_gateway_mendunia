const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Contact, ContactGroup } = require('../models/Contact');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const upload = multer({ dest: path.resolve('./uploads/temp') });

// ── GROUPS ──────────────────────────────────────────────────────────────────
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await ContactGroup.findAll({ where: { user_id: req.user.id }, order: [['created_at', 'DESC']] });
    res.json({ success: true, data: groups });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/groups', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Group name required' });
    const group = await ContactGroup.create({ user_id: req.user.id, name, description });
    res.status(201).json({ success: true, data: group });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/groups/:id', auth, async (req, res) => {
  try {
    const group = await ContactGroup.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    await group.update(req.body);
    res.json({ success: true, data: group });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/groups/:id', auth, async (req, res) => {
  try {
    const group = await ContactGroup.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    await Contact.update({ group_id: null }, { where: { group_id: group.id } });
    await group.destroy();
    res.json({ success: true, message: 'Group deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── CONTACTS ─────────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { group_id, search, page = 1, limit = 50 } = req.query;
    const where = { user_id: req.user.id };
    if (group_id) where.group_id = group_id;
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone_number: { [Op.like]: `%${search}%` } },
      ];
    }
    const offset = (page - 1) * limit;
    const { count, rows } = await Contact.findAndCountAll({ where, order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset) });
    res.json({ success: true, data: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, phone_number, group_id, notes } = req.body;
    if (!phone_number) return res.status(400).json({ success: false, message: 'Phone number required' });
    const contact = await Contact.create({ user_id: req.user.id, name, phone_number: normalizePhone(phone_number), group_id, notes });
    if (group_id) await ContactGroup.increment('contact_count', { where: { id: group_id } });
    res.status(201).json({ success: true, data: contact });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    if (req.body.phone_number) req.body.phone_number = normalizePhone(req.body.phone_number);
    await contact.update(req.body);
    res.json({ success: true, data: contact });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    await contact.destroy();
    res.json({ success: true, message: 'Contact deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/contacts/import - import from CSV/TXT
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
    const content = fs.readFileSync(req.file.path, 'utf-8');
    fs.unlinkSync(req.file.path);

    const lines = content.split(/\r?\n/).filter(Boolean);
    const contacts = [];
    let imported = 0, skipped = 0;

    for (const line of lines) {
      const parts = line.split(/[,;\t]/);
      let phone = parts[0]?.trim();
      const name = parts[1]?.trim() || '';
      if (!phone) { skipped++; continue; }
      phone = normalizePhone(phone);
      if (!phone) { skipped++; continue; }

      const exists = await Contact.findOne({ where: { user_id: req.user.id, phone_number: phone } });
      if (!exists) {
        contacts.push({ user_id: req.user.id, phone_number: phone, name, group_id: req.body.group_id || null });
        imported++;
      } else {
        skipped++;
      }
    }

    if (contacts.length > 0) {
      await Contact.bulkCreate(contacts);
      if (req.body.group_id) {
        await ContactGroup.update({ contact_count: imported }, { where: { id: req.body.group_id } });
      }
    }

    res.json({ success: true, message: `Imported ${imported}, skipped ${skipped}`, imported, skipped });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

function normalizePhone(phone) {
  phone = phone.replace(/\D/g, '');
  if (phone.startsWith('0')) phone = '62' + phone.slice(1);
  if (!phone.startsWith('62') && phone.length > 8) phone = '62' + phone;
  return phone;
}

module.exports = router;
