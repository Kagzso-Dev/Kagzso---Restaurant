const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, changePassword } = require('../controllers/settingController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

router.use(protect, requireTenant);

router.get('/', getSettings);
router.put('/', authorize('admin'), updateSettings);
router.post('/change-password', authorize('admin'), changePassword);

module.exports = router;
