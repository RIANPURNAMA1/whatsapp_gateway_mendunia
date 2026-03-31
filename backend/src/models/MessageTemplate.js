const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. Model MessageTemplate
const MessageTemplate = sequelize.define('MessageTemplate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  media_type: { type: DataTypes.ENUM('none','image','video','document'), defaultValue: 'none' },
  media_url: { type: DataTypes.STRING(500), defaultValue: null },
  variables: { type: DataTypes.JSON, defaultValue: null },
}, { 
  tableName: 'message_templates',
  underscored: true // Mengikuti standar database (created_at)
});

// 2. Model AutoReply
const AutoReply = sequelize.define('AutoReply', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  session_id: { type: DataTypes.INTEGER, allowNull: false },
  trigger_keyword: { type: DataTypes.STRING(255), allowNull: false },
  match_type: { type: DataTypes.ENUM('exact','contains','starts_with','regex'), defaultValue: 'contains' },
  reply_message: { type: DataTypes.TEXT, allowNull: false },
  media_type: { type: DataTypes.ENUM('none','image','document'), defaultValue: 'none' },
  media_url: { type: DataTypes.STRING(500), defaultValue: null },
  is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  reply_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { 
  tableName: 'auto_replies',
  underscored: true 
});

// 3. Model MessageLog (Sesuai tabel yang kamu buat tadi)
const MessageLog = sequelize.define('MessageLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: { type: DataTypes.INTEGER, allowNull: false },
  direction: { type: DataTypes.ENUM('incoming','outgoing'), allowNull: false },
  from_number: { type: DataTypes.STRING(20), allowNull: false },
  to_number: { type: DataTypes.STRING(20), allowNull: false },
  message_type: { type: DataTypes.ENUM('text','image','video','document','audio','sticker'), defaultValue: 'text' },
  content: { type: DataTypes.TEXT, defaultValue: null },
  media_url: { type: DataTypes.STRING(500), defaultValue: null },
  message_id: { type: DataTypes.STRING(100), defaultValue: null },
  is_read: { type: DataTypes.TINYINT(1), defaultValue: 0 },
}, { 
  tableName: 'message_logs', 
  updatedAt: false,
  underscored: true 
});

// Ekspor semua model agar bisa digunakan di rute lain
module.exports = { 
  sequelize, 
  MessageTemplate, 
  AutoReply, 
  MessageLog 
};