const express = require('express');
const router = express.Router();
const kontakController = require('../controllers/kontak.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// GET kontak (pribadi user + kontak kantor) dapat diakses semua role terotentikasi
router.get('/', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), kontakController.getAll);
router.get('/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), kontakController.getById);

// Kelola kontak (CRUD) dapat dilakukan oleh semua role (terisolasi per user di controller)
router.post('/', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), kontakController.create);
router.put('/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), kontakController.update);
router.delete('/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), kontakController.remove);

module.exports = router;
