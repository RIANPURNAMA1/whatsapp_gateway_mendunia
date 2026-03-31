const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ContactGroup = sequelize.define('ContactGroup', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: null },
  contact_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'contact_groups' });

const Contact = sequelize.define('Contact', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(150), defaultValue: null },
  phone_number: { type: DataTypes.STRING(20), allowNull: false },
  group_id: { type: DataTypes.INTEGER, defaultValue: null },
  is_valid: { type: DataTypes.TINYINT(1), defaultValue: 1 },
  notes: { type: DataTypes.TEXT, defaultValue: null },
}, { tableName: 'contacts' });

module.exports = { ContactGroup, Contact };
