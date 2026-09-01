const router = require('express').Router();
const lookupController = require('../controllers/lookup.controller');
const auth = require('../middleware/auth');

router.get('/volume', auth, lookupController.lookupVolume);
router.get('/density', auth, lookupController.lookupDensity);
router.get('/tinggi-range', auth, lookupController.getTinggiRange);

module.exports = router;
