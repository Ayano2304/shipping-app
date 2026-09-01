const express = require('express');
const router = express.Router();
const notifikasiController = require('../controllers/notifikasi.controller');
const auth = require('../middleware/auth');

router.get('/', auth, notifikasiController.getNotifikasi);
router.put('/read-all', auth, notifikasiController.markAllAsRead);
router.put('/:id/read', auth, notifikasiController.markAsRead);
router.delete('/:id', auth, notifikasiController.deleteNotifikasi);

module.exports = router;
