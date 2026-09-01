const router = require('express').Router();
const masterdataController = require('../controllers/masterdata.controller');
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const multer = require('multer');

// Secure Multer Configuration (Max 10MB, only Excel formats)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB Limit
  fileFilter: (req, file, cb) => {
    const isExcel = file.originalname.match(/\.(xlsx|xls)$/i);
    if (!isExcel) {
      return cb(new Error('Format file tidak didukung. Harap upload file Excel (.xlsx atau .xls).'), false);
    }
    cb(null, true);
  }
});

// Get master data
router.get('/sounding', auth, masterdataController.getSoundingTable);
router.get('/density', auth, masterdataController.getDensityTable);
router.get('/faktor-koreksi', auth, masterdataController.getFaktorKoreksiTable);

// Import Excel
router.post('/import-excel', auth, roleGuard('ADMIN'), upload.single('file'), masterdataController.importExcel);
router.post('/import-sounding', auth, roleGuard('ADMIN'), upload.single('file'), masterdataController.importSoundingFromExcel);

// CRUD Sounding
router.post('/sounding', auth, roleGuard('ADMIN'), masterdataController.createSounding);
router.put('/sounding/:id', auth, roleGuard('ADMIN'), masterdataController.updateSounding);
router.delete('/sounding/:id', auth, roleGuard('ADMIN'), masterdataController.deleteSounding);

module.exports = router;
