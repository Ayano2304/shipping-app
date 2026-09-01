const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

router.get('/', auth, roleGuard('ADMIN'), usersController.getAll);
router.get('/:id', auth, roleGuard('ADMIN'), usersController.getById);
router.post('/', auth, roleGuard('ADMIN'), usersController.create);
router.put('/:id', auth, roleGuard('ADMIN'), usersController.update);
router.delete('/:id', auth, roleGuard('ADMIN'), usersController.remove);

module.exports = router;
