const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { BlastCampaign, BlastLog } = require('../models/BlastCampaign');
const { Contact } = require('../models/Contact');
const WaSession = require('../models/WaSession');
const { startCampaign, pauseCampaign, resumeCampaign, stopCampaign } = require('../services/blastService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve('./uploads/media');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/blast
router.get('/', auth, async (req, res) => {
  try {
    const campaigns = await BlastCampaign.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: campaigns });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/blast - create campaign
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { name, session_id, message, delay_min, delay_max, scheduled_at, contact_ids, group_id } = req.body;
    if (!name || !session_id || !message)
      return res.status(400).json({ success: false, message: 'Name, session and message required' });

    const session = await WaSession.findOne({ where: { id: session_id, user_id: req.user.id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    let mediaType = 'none', mediaUrl = null;
    if (req.file) {
      mediaUrl = req.file.path;
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (['.jpg','.jpeg','.png','.gif'].includes(ext)) mediaType = 'image';
      else if (['.mp4','.mov'].includes(ext)) mediaType = 'video';
      else mediaType = 'document';
    }

    const campaign = await BlastCampaign.create({
      user_id: req.user.id, session_id, name, message,
      media_type: mediaType, media_url: mediaUrl,
      delay_min: delay_min || 2000, delay_max: delay_max || 5000,
      scheduled_at: scheduled_at || null,
    });

    // Add contacts to blast_logs
    let contacts = [];
    if (group_id) {
      contacts = await Contact.findAll({ where: { user_id: req.user.id, group_id } });
    } else if (contact_ids) {
      const ids = JSON.parse(contact_ids);
      contacts = await Contact.findAll({ where: { id: ids, user_id: req.user.id } });
    }

    if (contacts.length > 0) {
      const logs = contacts.map(c => ({
        campaign_id: campaign.id,
        contact_id: c.id,
        phone_number: c.phone_number,
        contact_name: c.name,
        status: 'pending',
      }));
      await BlastLog.bulkCreate(logs);
      await campaign.update({ total_contacts: contacts.length });
    }

    res.status(201).json({ success: true, data: campaign });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/blast/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const campaign = await BlastCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    const logs = await BlastLog.findAll({ where: { campaign_id: campaign.id }, order: [['id', 'ASC']] });
    res.json({ success: true, data: campaign, logs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/blast/:id/start
router.post('/:id/start', auth, async (req, res) => {
  try {
    const campaign = await BlastCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

    const io = req.app.get('io');
    startCampaign(campaign.id, io).catch(console.error); // async, don't await
    res.json({ success: true, message: 'Campaign started' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/blast/:id/pause
router.post('/:id/pause', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    await pauseCampaign(parseInt(req.params.id), io);
    res.json({ success: true, message: 'Campaign paused' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/blast/:id/resume
router.post('/:id/resume', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    resumeCampaign(parseInt(req.params.id), io).catch(console.error);
    res.json({ success: true, message: 'Campaign resumed' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/blast/:id/stop
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const io = req.app.get('io');
    await stopCampaign(parseInt(req.params.id), io);
    res.json({ success: true, message: 'Campaign stopped' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/blast/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const campaign = await BlastCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
    await BlastLog.destroy({ where: { campaign_id: campaign.id } });
    await campaign.destroy();
    res.json({ success: true, message: 'Campaign deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
