const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WaSession = sequelize.define('WaSession', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  session_name: { type: DataTypes.STRING(100), allowNull: false },
  phone_number: { type: DataTypes.STRING(20), defaultValue: null },
  status: {
    type: DataTypes.ENUM('disconnected', 'connecting', 'connected', 'banned'),
    defaultValue: 'disconnected',
  },
  session_data: { type: DataTypes.TEXT('long'), defaultValue: null },
  qr_code: { type: DataTypes.TEXT, defaultValue: null },
  last_connected: { type: DataTypes.DATE, defaultValue: null },
}, { tableName: 'wa_sessions' });

module.exports = WaSession;
