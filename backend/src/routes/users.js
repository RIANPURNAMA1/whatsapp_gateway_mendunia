const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak' });
    }
    next();
  };
};

router.use(auth);

router.get('/', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const where = req.user.role === 'admin' ? { role: 'user' } : {};
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      raw: true,
    });
    res.json({ success: true, data: users });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email dan password wajib diisi' });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
    }

    let userRole = role || 'user';
    if (req.user.role === 'admin') {
      userRole = 'user';
    }

    const user = await User.create({ name, email, password, role: userRole });
    res.status(201).json({
      success: true,
      message: 'User berhasil dibuat',
      data: { id: user.id, name: user.name, email: user.email, role: user.role, is_active: user.is_active, created_at: user.created_at },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    if (req.user.role === 'admin' && user.role !== 'user') {
      return res.status(403).json({ success: false, message: 'Tidak bisa edit user lain' });
    }

    const { name, email, password, role, is_active } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (email && email !== user.email) {
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(400).json({ success: false, message: 'Email sudah terdaftar' });
      updates.email = email;
    }
    if (password) updates.password = password;
    if (req.user.role === 'superadmin' && role) updates.role = role;
    if (typeof is_active === 'boolean') updates.is_active = is_active;

    await user.update(updates);
    res.json({ success: true, message: 'User berhasil diupdate' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:id', requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    if (req.user.role === 'admin' && user.role !== 'user') {
      return res.status(403).json({ success: false, message: 'Tidak bisa menghapus user lain' });
    }

    await user.destroy();
    res.json({ success: true, message: 'User berhasil dihapus' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
