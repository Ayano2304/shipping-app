const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

router.get('/stats', auth, dashboardController.getStats);
router.get('/tren-susut', auth, dashboardController.getTrenSusut);
router.get('/per-kapal', auth, dashboardController.getSusutPerKapal);

module.exports = router;
