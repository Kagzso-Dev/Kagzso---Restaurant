const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    searchOrders,
    updateOrderStatus,
    updateItemStatus,
    processPayment,
    cancelOrder,
    cancelOrderItem,
} = require('../controllers/orderController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

// All order routes require valid JWT with tenantId + branchId
router.use(protect, requireTenant);

// ── Search (must be BEFORE /:id to avoid "search" being treated as an ID) ───
router.get('/search', authorize('admin', 'cashier', 'waiter'), searchOrders);

router.route('/')
    .post(authorize('waiter', 'admin', 'cashier'), createOrder)
    .get(authorize('kitchen', 'cashier', 'admin', 'waiter'), getOrders);

router.route('/:id/status')
    .put(authorize('kitchen', 'admin', 'cashier', 'superadmin'), updateOrderStatus);

router.route('/:id/cancel')
    .put(authorize('waiter', 'kitchen', 'admin', 'superadmin'), cancelOrder);

router.route('/:id/items/:itemId/status')
    .put(authorize('kitchen', 'admin', 'superadmin'), updateItemStatus);

router.route('/:id/items/:itemId/cancel')
    .put(authorize('waiter', 'kitchen', 'admin', 'superadmin'), cancelOrderItem);

router.route('/:id/payment')
    .put(authorize('cashier', 'admin', 'superadmin'), processPayment);

module.exports = router;
