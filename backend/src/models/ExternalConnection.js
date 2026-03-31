const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExternalConnection = sequelize.define('ExternalConnection', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  name: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  api_url: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  api_token: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  device_id: { 
    type: DataTypes.STRING(50), 
    defaultValue: null 
  },
  is_active: { 
    type: DataTypes.TINYINT(1), 
    defaultValue: 1 
  },
  last_connected: { 
    type: DataTypes.DATE, 
    defaultValue: null 
  },
}, {
  tableName: 'external_connections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = ExternalConnection;