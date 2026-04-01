const sequelize = require('../config/database');
const User = require('../models/User');

async function seedSuperAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const email = process.env.SUPERADMIN_EMAIL || 'admin@mendunia.id';
    const password = process.env.SUPERADMIN_PASSWORD || 'admin123';
    const name = process.env.SUPERADMIN_NAME || 'Super Admin';

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      console.log('ℹ️ Superadmin already exists:', email);
      process.exit(0);
    }

    await User.create({
      name,
      email,
      password,
      role: 'admin',
      is_active: true,
    });

    console.log('✅ Superadmin created successfully!');
    console.log('📧 Email:', email);
    console.log('🔐 Password:', password);
    console.log('⚠️ Please change the password after first login!');
    
    process.exit(0);
  } catch (e) {
    console.error('❌ Seeder failed:', e.message);
    process.exit(1);
  }
}

seedSuperAdmin();
