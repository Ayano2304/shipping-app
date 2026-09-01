const express = require('express');
const router = express.Router();
const pengirimanController = require('../controllers/pengiriman.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/', auth, pengirimanController.getAll);
router.get('/:id', auth, pengirimanController.getById);
router.post('/', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), pengirimanController.create);
router.put('/:id', auth, roleGuard('ADMIN', 'PETUGAS', 'SURVEYOR'), pengirimanController.update);
router.delete('/:id', auth, roleGuard('ADMIN'), pengirimanController.remove);

module.exports = router;
