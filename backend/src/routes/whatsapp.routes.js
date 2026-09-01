const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const whatsappController = require('../controllers/whatsapp.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Rate limiter for WhatsApp sending (Maks 30 pesan per 5 menit)
const waLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Terlalu banyak permintaan kirim WhatsApp. Silakan tunggu beberapa saat.' },
});

// Device & Testing
router.post('/status', auth, roleGuard('ADMIN', 'PETUGAS'), whatsappController.checkDeviceStatus);
router.post('/test', auth, roleGuard('ADMIN', 'PETUGAS'), waLimiter, whatsappController.testKoneksi);

// Templates Pesan WA
router.get('/templates', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.getTemplates);
router.post('/templates', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.createTemplate);
router.put('/templates/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.updateTemplate);
router.delete('/templates/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.deleteTemplate);

// Kirim Laporan
router.post('/kirim/:pengirimanId', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), waLimiter, whatsappController.kirimLaporan);

module.exports = router;
