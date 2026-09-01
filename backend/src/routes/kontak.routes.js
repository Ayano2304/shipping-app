const express = require('express');
const router = express.Router();
const kontakController = require('../controllers/kontak.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// GET all kontak is accessible to all authenticated users (ADMIN & PETUGAS) for reporting
router.get('/', auth, kontakController.getAll);
router.get('/:id', auth, kontakController.getById);

// Manage kontak (create, update, delete) is restricted to ADMIN
router.post('/', auth, roleGuard('ADMIN'), kontakController.create);
router.put('/:id', auth, roleGuard('ADMIN'), kontakController.update);
router.delete('/:id', auth, roleGuard('ADMIN'), kontakController.remove);

module.exports = router;
