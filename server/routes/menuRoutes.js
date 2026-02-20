const express = require('express');
const router = express.Router();
const { getMenuItems, updateMenuItem, deleteMenuItem, createMenuItem } = require('../controllers/menuController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

router.use(protect, requireTenant);

router.route('/')
    .get(getMenuItems)
    .post(authorize('admin'), createMenuItem);

router.route('/:id')
    .put(authorize('admin', 'kitchen'), updateMenuItem)
    .delete(authorize('admin'), deleteMenuItem);

module.exports = router;
