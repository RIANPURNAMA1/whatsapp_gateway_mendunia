const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

// 1. DEFINE DULU
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'user'), defaultValue: 'user' },
  is_active: { type: DataTypes.TINYINT(1), defaultValue: 1 },
}, {
  tableName: 'users',
});

// 2. BARU TAMBAHKAN HOOK
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// 3. METHOD
User.prototype.comparePassword = async function (pwd) {
  return await bcrypt.compare(pwd, this.password);
};

// 4. EXPORT
module.exports = User;