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

// User Self-Service Device (Semua Role: ADMIN, PETUGAS, SURVEYOR)
router.get('/my-device', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.getMyDevice);
router.post('/my-device/qr', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.requestMyDeviceQr);
router.post('/my-device/status', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.checkMyDeviceStatus);
router.post('/my-device/disconnect', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.disconnectMyDevice);
router.post('/my-device/token', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.saveMyDeviceToken);
router.post('/my-device/test', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), waLimiter, whatsappController.testMyDevice);

// Device Management (Multi-Device Fonnte Admin)
router.get('/devices', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.getDevices);
router.post('/devices/auto', auth, roleGuard('ADMIN'), whatsappController.addDeviceAuto);
router.post('/devices/manual', auth, roleGuard('ADMIN'), whatsappController.addDeviceManual);
router.get('/devices/:id/qr', auth, roleGuard('ADMIN'), whatsappController.getDeviceQr);
router.post('/devices/:id/status', auth, roleGuard('ADMIN'), whatsappController.checkDeviceStatusById);
router.post('/devices/:id/disconnect', auth, roleGuard('ADMIN'), whatsappController.disconnectDevice);
router.put('/devices/:id/default', auth, roleGuard('ADMIN'), whatsappController.setDefaultDevice);
router.delete('/devices/:id', auth, roleGuard('ADMIN'), whatsappController.deleteDevice);
router.post('/devices/:id/test', auth, roleGuard('ADMIN'), waLimiter, whatsappController.testDevice);

// Legacy Device & Testing
router.post('/status', auth, roleGuard('ADMIN', 'PETUGAS'), whatsappController.checkDeviceStatus);
router.post('/test', auth, roleGuard('ADMIN', 'PETUGAS'), waLimiter, whatsappController.testKoneksi);

// Templates Pesan WA
router.get('/templates', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.getTemplates);
router.post('/templates', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.createTemplate);
router.put('/templates/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.updateTemplate);
router.delete('/templates/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), whatsappController.deleteTemplate);

// Kirim Laporan (Single / Broadcast)
router.post('/kirim/:pengirimanId', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), waLimiter, whatsappController.kirimLaporan);

module.exports = router;
