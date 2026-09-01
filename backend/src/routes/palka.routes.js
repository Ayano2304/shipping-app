const express = require('express');
const router = express.Router();
const palkaController = require('../controllers/palka.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/pengiriman/:pengirimanId', auth, palkaController.getByPengiriman);
router.post('/batch', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), palkaController.saveBatch);
router.delete('/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), palkaController.remove);

module.exports = router;
