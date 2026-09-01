const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');

exports.getAll = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nama: true, username: true, role: true, kontakWa: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, nama: true, username: true, role: true, kontakWa: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nama, username, password, role, kontakWa } = req.body;
    if (!nama || !username || !password || !role) {
      return res.status(400).json({ error: 'Nama, username, password, dan role wajib diisi.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password harus memiliki minimal 6 karakter.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { nama, username, password: hashed, role, kontakWa: kontakWa || null },
      select: { id: true, nama: true, username: true, role: true, kontakWa: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Username sudah digunakan.' });
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { nama, username, password, role, kontakWa } = req.body;
    const data = {};
    if (nama) data.nama = nama;
    if (username) data.username = username;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password harus memiliki minimal 6 karakter.' });
      }
      data.password = await bcrypt.hash(password, 10);
    }
    if (role) data.role = role;
    if (kontakWa !== undefined) data.kontakWa = kontakWa;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: { id: true, nama: true, username: true, role: true, kontakWa: true, createdAt: true },
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Username sudah digunakan.' });
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri.' });
    }
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'User berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
