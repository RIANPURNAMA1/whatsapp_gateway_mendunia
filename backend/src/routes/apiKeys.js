const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const auth = require('../middleware/auth');

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

router.get('/', auth, async (req, res) => {
  try {
    const keys = await ApiKey.findAll({ 
      where: { user_id: req.user.id },
      attributes: ['id', 'key_value', 'name', 'is_active', 'last_used', 'created_at'],
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: keys });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;
    const keyValue = generateApiKey();
    
    const apiKey = await ApiKey.create({
      user_id: req.user.id,
      key_value: keyValue,
      name: name || null,
    });
    
    res.json({ 
      success: true, 
      data: {
        id: apiKey.id,
        key_value: apiKey.key_value,
        name: apiKey.name,
        is_active: apiKey.is_active,
        created_at: apiKey.created_at,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ApiKey.destroy({ 
      where: { id: req.params.id, user_id: req.user.id }
    });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'API Key tidak ditemukan' });
    }
    
    res.json({ success: true, message: 'API Key dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const key = await ApiKey.findOne({ 
      where: { id: req.params.id, user_id: req.user.id }
    });
    
    if (!key) {
      return res.status(404).json({ success: false, message: 'API Key tidak ditemukan' });
    }
    
    key.is_active = key.is_active === 1 ? 0 : 1;
    await key.save();
    
    res.json({ success: true, data: { is_active: key.is_active } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;