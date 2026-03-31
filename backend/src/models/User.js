const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt'); // atau 'bcryptjs'

const User = sequelize.define('User', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  name: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING(150), 
    allowNull: false, 
    unique: true,
    validate: { isEmail: true } // Tambahan validasi format email
  },
  password: { 
    type: DataTypes.STRING(255), 
    allowNull: false 
  },
  role: { 
    type: DataTypes.ENUM('admin', 'user'), 
    defaultValue: 'user' 
  },
  is_active: { 
    type: DataTypes.BOOLEAN, // Gunakan BOOLEAN agar lebih standar Sequelize
    defaultValue: true 
  },
}, {
  tableName: 'users',
  timestamps: true, // Sangat disarankan untuk audit data (createdAt, updatedAt)
  hooks: {
    // Hooks diletakkan di sini lebih aman
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance Method
User.prototype.comparePassword = async function (pwd) {
  return await bcrypt.compare(pwd, this.password);
};

module.exports = User;