const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Fonnte Account Token Settings (ADMIN Only)
router.get('/fonnte', auth, roleGuard('ADMIN'), settingsController.getFonnteSetting);
router.post('/fonnte', auth, roleGuard('ADMIN'), settingsController.updateFonnteSetting);
router.post('/fonnte/check', auth, roleGuard('ADMIN'), settingsController.checkFonnteAccount);

module.exports = router;
