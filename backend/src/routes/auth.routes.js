const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth');

// Strict Rate Limiter for Login (10 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login gagal. Silakan coba lagi setelah 15 menit.' },
});

// Strict Rate Limiter for Change Password (10 attempts per hour)
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Terlalu banyak percobaan ubah password. Silakan coba lagi nanti.' },
});

router.post('/login', loginLimiter, authController.login);
router.get('/me', auth, authController.getMe);
router.post('/change-password', auth, passwordLimiter, authController.changePassword);

module.exports = router;
