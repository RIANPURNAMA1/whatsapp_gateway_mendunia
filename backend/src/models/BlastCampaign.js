const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlastCampaign = sequelize.define('BlastCampaign', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  session_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(150), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  media_type: { type: DataTypes.ENUM('none','image','video','document'), defaultValue: 'none' },
  media_url: { type: DataTypes.STRING(500), defaultValue: null },
  status: {
    type: DataTypes.ENUM('draft','scheduled','running','paused','completed','failed'),
    defaultValue: 'draft',
  },
  scheduled_at: { type: DataTypes.DATE, defaultValue: null },
  started_at: { type: DataTypes.DATE, defaultValue: null },
  completed_at: { type: DataTypes.DATE, defaultValue: null },
  total_contacts: { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  delay_min: { type: DataTypes.INTEGER, defaultValue: 2000 },
  delay_max: { type: DataTypes.INTEGER, defaultValue: 5000 },
}, { tableName: 'blast_campaigns' });

const BlastLog = sequelize.define('BlastLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  campaign_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, defaultValue: null },
  phone_number: { type: DataTypes.STRING(20), allowNull: false },
  contact_name: { type: DataTypes.STRING(150), defaultValue: null },
  status: { type: DataTypes.ENUM('pending','sent','failed','invalid'), defaultValue: 'pending' },
  message_id: { type: DataTypes.STRING(100), defaultValue: null },
  error_message: { type: DataTypes.TEXT, defaultValue: null },
  sent_at: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'blast_logs' });

module.exports = { BlastCampaign, BlastLog };
