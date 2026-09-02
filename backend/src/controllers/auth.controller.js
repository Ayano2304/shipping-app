const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const verifyTurnstile = async (token, remoteIp) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Bypass jika belum dikonfigurasi
  if (!token) return false;

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (remoteIp) {
      const cleanIp = remoteIp.split(',')[0].trim();
      formData.append('remoteip', cleanIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    const outcome = await response.json();
    return !!outcome.success;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return false;
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password, captchaToken } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    // Verifikasi Keamanan Cloudflare Turnstile
    if (process.env.TURNSTILE_SECRET_KEY) {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      const isValidCaptcha = await verifyTurnstile(captchaToken, ip);
      if (!isValidCaptcha) {
        return res.status(400).json({
          error: 'Verifikasi keamanan (CAPTCHA) gagal. Pastikan verifikasi Cloudflare Turnstile berhasil sebelum login.'
        });
      }
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, nama: user.nama },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: { id: user.id, nama: user.nama, username: user.username, role: user.role, kontakWa: user.kontakWa }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nama: true, username: true, role: true, kontakWa: true, createdAt: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password baru harus memiliki minimal 6 karakter.' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Password lama salah.' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ message: 'Password berhasil diubah.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
