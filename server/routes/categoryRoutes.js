const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

router.use(protect, requireTenant);

router.route('/')
    .get(getCategories)
    .post(authorize('admin'), createCategory);

module.exports = router;
