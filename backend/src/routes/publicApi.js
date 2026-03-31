const express = require('express');
const router = express.Router();
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const { WaSession } = require('../models/WaSession');
const { MessageLog } = require('../models/MessageTemplate');
const { sendMessage } = require('../services/whatsappService');
const { Op } = require('sequelize');

async function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ success: false, message: 'API Key required. Add x-api-key header.' });
  }
  
  try {
    const keyData = await ApiKey.findOne({
      where: { key_value: apiKey, is_active: 1 },
      include: [{ model: User }]
    });
    
    if (!keyData) {
      return res.status(401).json({ success: false, message: 'Invalid or inactive API Key' });
    }
    
    keyData.last_used = new Date();
    await keyData.save();
    
    req.user = keyData.User;
    req.userId = keyData.User.id;
    req.apiKeyId = keyData.id;
    next();
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

router.get('/profile', verifyApiKey, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'name', 'email', 'role', 'createdAt']
    });
    
    const sessionCount = await WaSession.count({ where: { user_id: req.userId } });
    const connectedCount = await WaSession.count({ where: { user_id: req.userId, status: 'connected' } });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messageCount = await MessageLog.count({
      where: { 
        session_id: req.userId,
        createdAt: { [Op.gte]: today }
      }
    });
    
    res.json({ 
      success: true, 
      data: {
        user,
        devices: { total: sessionCount, connected: connectedCount },
        usage: { messages_today: messageCount }
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/send', verifyApiKey, async (req, res) => {
  try {
    const { device_id, number, message, session_id } = req.body;
    
    if (!number || !message) {
      return res.status(400).json({ success: false, message: 'Number and message are required' });
    }
    
    let sessionId = session_id || device_id;
    
    if (!sessionId) {
      const sessions = await WaSession.findAll({ where: { user_id: req.userId } });
      if (sessions.length === 0) {
        return res.status(400).json({ success: false, message: 'No device found. Create a device first.' });
      }
      sessionId = sessions[0].id;
    }
    
    const session = await WaSession.findOne({ 
      where: { id: sessionId, user_id: req.userId }
    });
    
    if (!session || session.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'Device not connected or not found' });
    }
    
    const result = await sendMessage(sessionId, number, message);
    
    res.json({ 
      success: true, 
      message: 'Message sent',
      data: { session_id: sessionId, number, message_id: result?.key?.id }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/send-media', verifyApiKey, async (req, res) => {
  try {
    const { session_id, number, image, video, document, caption } = req.body;
    
    if (!number) {
      return res.status(400).json({ success: false, message: 'Number is required' });
    }
    
    let sessionId = session_id;
    
    if (!sessionId) {
      const sessions = await WaSession.findAll({ where: { user_id: req.userId } });
      if (sessions.length === 0) {
        return res.status(400).json({ success: false, message: 'No device found' });
      }
      sessionId = sessions[0].id;
    }
    
    const session = await WaSession.findOne({ 
      where: { id: sessionId, user_id: req.userId } 
    });
    
    if (!session || session.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'Device not connected' });
    }
    
    let mediaOptions = { type: 'none' };
    
    if (image) mediaOptions = { type: 'image', url: image, caption: caption || '' };
    else if (video) mediaOptions = { type: 'video', url: video, caption: caption || '' };
    else if (document) mediaOptions = { type: 'document', url: document, caption: caption || '' };
    
    const result = await sendMessage(sessionId, number, caption || '', mediaOptions);
    
    res.json({ 
      success: true, 
      message: 'Media sent',
      data: { session_id: sessionId, number }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/devices', verifyApiKey, async (req, res) => {
  try {
    const sessions = await WaSession.findAll({ 
      where: { user_id: req.userId },
      attributes: ['id', 'session_name', 'phone_number', 'status']
    });
    
    res.json({ success: true, data: sessions });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/device/:id/status', verifyApiKey, async (req, res) => {
  try {
    const session = await WaSession.findOne({ 
      where: { id: req.params.id, user_id: req.userId },
      attributes: ['id', 'session_name', 'phone_number', 'status']
    });
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    
    res.json({ success: true, data: session });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/schedule', verifyApiKey, async (req, res) => {
  try {
    const { number, message, session_id, schedule_time } = req.body;
    
    if (!number || !message) {
      return res.status(400).json({ success: false, message: 'Number, message, and schedule_time required' });
    }
    
    if (!schedule_time) {
      return res.status(400).json({ success: false, message: 'schedule_time required (ISO format)' });
    }
    
    const scheduleDate = new Date(schedule_time);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid schedule_time format' });
    }
    
    let sessionId = session_id;
    if (!sessionId) {
      const sessions = await WaSession.findAll({ where: { user_id: req.userId } });
      if (sessions.length === 0) {
        return res.status(400).json({ success: false, message: 'No device found' });
      }
      sessionId = sessions[0].id;
    }
    
    const session = await WaSession.findOne({ 
      where: { id: sessionId, user_id: req.userId }
    });
    
    if (!session || session.status !== 'connected') {
      return res.status(400).json({ success: false, message: 'Device not connected' });
    }
    
    const { MessageTemplate } = require('../models/MessageTemplate');
    const scheduled = await MessageTemplate.create({
      user_id: req.userId,
      template_name: 'Scheduled Message',
      content: message,
      session_id: sessionId,
      is_schedule: 1,
      schedule_time: scheduleDate,
    });
    
    res.json({ 
      success: true, 
      message: 'Message scheduled',
      data: { 
        id: scheduled.id, 
        schedule_time: scheduleDate,
        number,
        message 
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/schedules', verifyApiKey, async (req, res) => {
  try {
    const { MessageTemplate } = require('../models/MessageTemplate');
    const schedules = await MessageTemplate.findAll({
      where: { user_id: req.userId, is_schedule: 1 },
      attributes: ['id', 'template_name', 'content', 'session_id', 'schedule_time', 'createdAt'],
      order: [['schedule_time', 'ASC']]
    });
    
    res.json({ success: true, data: schedules });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/schedule/:id', verifyApiKey, async (req, res) => {
  try {
    const { MessageTemplate } = require('../models/MessageTemplate');
    const deleted = await MessageTemplate.destroy({
      where: { id: req.params.id, user_id: req.userId, is_schedule: 1 }
    });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    
    res.json({ success: true, message: 'Schedule deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/inbox', verifyApiKey, async (req, res) => {
  try {
    const { limit = 50, offset = 0, number } = req.query;
    
    const where = { session_id: req.userId };
    if (number) {
      where.from_number = number;
    }
    
    const messages = await MessageLog.findAndCountAll({
      where,
      include: [{
        model: WaSession,
        where: { user_id: req.userId },
        attributes: ['id', 'session_name', 'phone_number']
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({ 
      success: true, 
      data: {
        messages: messages.rows,
        total: messages.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/inbox/:number', verifyApiKey, async (req, res) => {
  try {
    const { number } = req.params;
    
    const messages = await MessageLog.findAll({
      where: {
        session_id: req.userId,
        [Op.or]: [
          { from_number: number },
          { to_number: number }
        ]
      },
      include: [{
        model: WaSession,
        where: { user_id: req.userId },
        attributes: ['id', 'session_name']
      }],
      order: [['created_at', 'ASC']]
    });
    
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/templates', verifyApiKey, async (req, res) => {
  try {
    const { MessageTemplate } = require('../models/MessageTemplate');
    const templates = await MessageTemplate.findAll({
      where: { user_id: req.userId, is_schedule: 0 },
      attributes: ['id', 'template_name', 'content', 'createdAt']
    });
    
    res.json({ success: true, data: templates });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/templates', verifyApiKey, async (req, res) => {
  try {
    const { MessageTemplate } = require('../models/MessageTemplate');
    const { name, content } = req.body;
    
    if (!name || !content) {
      return res.status(400).json({ success: false, message: 'Name and content required' });
    }
    
    const template = await MessageTemplate.create({
      user_id: req.userId,
      template_name: name,
      content: content,
    });
    
    res.json({ success: true, data: { id: template.id, name: template.template_name, content: template.content } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/templates/:id', verifyApiKey, async (req, res) => {
  try {
    const { MessageTemplate } = require('../models/MessageTemplate');
    const deleted = await MessageTemplate.destroy({
      where: { id: req.params.id, user_id: req.userId }
    });
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    
    res.json({ success: true, message: 'Template deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;