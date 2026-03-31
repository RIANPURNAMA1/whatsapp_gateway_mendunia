const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ApiKey = sequelize.define('ApiKey', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  key_value: { 
    type: DataTypes.STRING(64), 
    allowNull: false, 
    unique: true 
  },
  name: { 
    type: DataTypes.STRING(100), 
    defaultValue: null 
  },
  is_active: { 
    type: DataTypes.TINYINT(1), 
    defaultValue: 1 
  },
  last_used: { 
    type: DataTypes.DATE, 
    defaultValue: null 
  },
}, {
  tableName: 'api_keys',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = ApiKey;