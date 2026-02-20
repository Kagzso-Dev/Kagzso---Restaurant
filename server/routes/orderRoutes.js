const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    updateOrderStatus,
    updateItemStatus,
    processPayment,
    cancelOrder,
    cancelOrderItem,
} = require('../controllers/orderController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

// All order routes require valid JWT with tenantId + branchId
router.use(protect, requireTenant);

router.route('/')
    .post(authorize('waiter', 'admin', 'cashier'), createOrder)
    .get(authorize('kitchen', 'cashier', 'admin', 'waiter'), getOrders);

router.route('/:id/status')
    .put(authorize('kitchen', 'admin', 'cashier'), updateOrderStatus);

router.route('/:id/cancel')
    .put(authorize('waiter', 'kitchen'), cancelOrder);

router.route('/:id/items/:itemId/status')
    .put(authorize('kitchen', 'admin'), updateItemStatus);

router.route('/:id/items/:itemId/cancel')
    .put(authorize('waiter', 'kitchen'), cancelOrderItem);

router.route('/:id/payment')
    .put(authorize('cashier', 'admin'), processPayment);

module.exports = router;
