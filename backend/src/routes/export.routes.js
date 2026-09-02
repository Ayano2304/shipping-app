const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const auth = require('../middleware/auth');

router.get('/pengiriman/:id/pdf', auth, exportController.exportPengirimanPDF);
router.get('/public/pdf/:id', exportController.exportPengirimanPDF);
router.get('/report/:slug', exportController.exportPublicReportBySlug);

module.exports = router;
