const express = require('express');
const router = express.Router();
const kontakController = require('../controllers/kontak.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// GET kontak (pribadi user + kontak kantor) hanya untuk ADMIN dan SURVEYOR
router.get('/', auth, roleGuard('ADMIN', 'SURVEYOR'), kontakController.getAll);
router.get('/:id', auth, roleGuard('ADMIN', 'SURVEYOR'), kontakController.getById);

// Kelola kontak (CRUD) hanya untuk ADMIN dan SURVEYOR
router.post('/', auth, roleGuard('ADMIN', 'SURVEYOR'), kontakController.create);
router.put('/:id', auth, roleGuard('ADMIN', 'SURVEYOR'), kontakController.update);
router.delete('/:id', auth, roleGuard('ADMIN', 'SURVEYOR'), kontakController.remove);

module.exports = router;
