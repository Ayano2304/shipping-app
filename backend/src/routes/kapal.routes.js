const express = require('express');
const router = express.Router();
const kapalController = require('../controllers/kapal.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/', auth, kapalController.getAll);
router.get('/:id', auth, kapalController.getById);
router.post('/', auth, roleGuard('ADMIN'), kapalController.create);
router.put('/:id', auth, roleGuard('ADMIN'), kapalController.update);
router.delete('/:id', auth, roleGuard('ADMIN'), kapalController.remove);

module.exports = router;
