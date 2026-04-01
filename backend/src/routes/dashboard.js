const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const WaSession = require('../models/WaSession');
const { BlastCampaign, BlastLog } = require('../models/BlastCampaign');
const { Contact, ContactGroup } = require('../models/Contact');
const { MessageLog } = require('../models/MessageTemplate');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

router.get('/stats', auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'superadmin' || req.user.role === 'admin';
    const userId = isAdmin ? null : req.user.id;
    const userWhere = userId ? { user_id: userId } : {};

    let sessions, totalContacts, totalGroups, campaigns, totalUsers, activeUsers;

    if (isAdmin) {
      [sessions, totalContacts, totalGroups, campaigns, totalUsers] = await Promise.all([
        WaSession.findAll(),
        Contact.count(),
        ContactGroup.count(),
        BlastCampaign.findAll(),
        sequelize.query(`SELECT COUNT(*) as count FROM users WHERE role = 'user' AND is_active = 1`, { type: QueryTypes.SELECT }),
      ]);
      activeUsers = totalUsers[0]?.count || 0;
    } else {
      [sessions, totalContacts, totalGroups, campaigns] = await Promise.all([
        WaSession.findAll({ where: userWhere }),
        Contact.count({ where: userWhere }),
        ContactGroup.count({ where: userWhere }),
        BlastCampaign.findAll({ where: userWhere }),
      ]);
      activeUsers = 0;
    }

    const connectedSessions = sessions.filter(s => s.status === 'connected').length;
    const totalCampaigns = campaigns.length;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
    const totalFailed = campaigns.reduce((sum, c) => sum + (c.failed_count || 0), 0);
    const activeCampaigns = campaigns.filter(c => c.status === 'running').length;

    let last7Days;
    if (isAdmin) {
      last7Days = await sequelize.query(`
        SELECT DATE(sent_at) as date, COUNT(*) as count
        FROM blast_logs
        WHERE status = 'sent'
          AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(sent_at)
        ORDER BY date ASC
      `, { type: QueryTypes.SELECT });
    } else {
      last7Days = await sequelize.query(`
        SELECT DATE(sent_at) as date, COUNT(*) as count
        FROM blast_logs
        WHERE campaign_id IN (SELECT id FROM blast_campaigns WHERE user_id = :userId)
          AND status = 'sent'
          AND sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(sent_at)
        ORDER BY date ASC
      `, { replacements: { userId }, type: QueryTypes.SELECT });
    }

    res.json({
      success: true,
      data: {
        sessions: { total: sessions.length, connected: connectedSessions },
        contacts: { total: totalContacts, groups: totalGroups },
        campaigns: { total: totalCampaigns, active: activeCampaigns },
        messages: { sent: totalSent, failed: totalFailed },
        users: { total: activeUsers },
        chart: last7Days,
        recent_campaigns: campaigns.slice(0, 5),
        role: req.user.role,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
