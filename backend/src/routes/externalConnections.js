const express = require('express');
const router = express.Router();
const axios = require('axios');
const ExternalConnection = require('../models/ExternalConnection');
const { WaSession } = require('../models/WaSession');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const connections = await ExternalConnection.findAll({ 
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, data: connections });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, api_url, api_token, device_id } = req.body;
    
    if (!name || !api_url || !api_token) {
      return res.status(400).json({ success: false, message: 'Name, API URL, dan API Token wajib diisi' });
    }
    
    const connection = await ExternalConnection.create({
      user_id: req.user.id,
      name,
      api_url: api_url.replace(/\/$/, ''),
      api_token,
      device_id: device_id || null,
    });
    
    res.json({ success: true, data: connection });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, api_url, api_token, device_id, is_active } = req.body;
    
    const connection = await ExternalConnection.findOne({ 
      where: { id: req.params.id, user_id: req.user.id } 
    });
    
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Koneksi tidak ditemukan' });
    }
    
    if (name) connection.name = name;
    if (api_url) connection.api_url = api_url.replace(/\/$/, '');
    if (api_token) connection.api_token = api_token;
    if (device_id !== undefined) connection.device_id = device_id;
    if (is_active !== undefined) connection.is_active = is_active;
    
    await connection.save();
    
    res.json({ success: true, data: connection });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await ExternalConnection.destroy({ 
      where: { id: req.params.id, user_id: req.user.id } 
    });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Koneksi tidak ditemukan' });
    }
    
    res.json({ success: true, message: 'Koneksi dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/test', auth, async (req, res) => {
  try {
    const connection = await ExternalConnection.findOne({ 
      where: { id: req.params.id, user_id: req.user.id } 
    });
    
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Koneksi tidak ditemukan' });
    }
    
    const response = await axios.get(`${connection.api_url}/api/devices`, {
      headers: { 'Authorization': `Bearer ${connection.api_token}` },
      timeout: 10000
    });
    
    connection.last_connected = new Date();
    await connection.save();
    
    res.json({ 
      success: true, 
      message: 'Koneksi berhasil',
      data: response.data 
    });
  } catch (e) {
    const message = e.response?.data?.message || e.message;
    res.status(400).json({ success: false, message: `Koneksi gagal: ${message}` });
  }
});

router.post('/:id/send', auth, async (req, res) => {
  try {
    const { number, message } = req.body;
    
    if (!number || !message) {
      return res.status(400).json({ success: false, message: 'Number dan message wajib diisi' });
    }
    
    const connection = await ExternalConnection.findOne({ 
      where: { id: req.params.id, user_id: req.user.id, is_active: 1 } 
    });
    
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Koneksi tidak ditemukan atau nonaktif' });
    }
    
    const payload = {
      number: number.replace(/[^0-9]/g, ''),
      message: message
    };
    
    if (connection.device_id) {
      payload.device_id = connection.device_id;
    }
    
    const response = await axios.post(`${connection.api_url}/api/public/send`, payload, {
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': connection.api_token
      },
      timeout: 30000
    });
    
    connection.last_connected = new Date();
    await connection.save();
    
    res.json({ 
      success: true, 
      message: 'Pesan terkirim',
      data: response.data 
    });
  } catch (e) {
    const message = e.response?.data?.message || e.message;
    res.status(400).json({ success: false, message: `Gagal mengirim: ${message}` });
  }
});

module.exports = router;