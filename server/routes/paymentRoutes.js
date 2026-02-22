const express = require('express');
const router = express.Router();
const {
    initiatePayment,
    cancelPayment,
    processPayment,
    getPaymentByOrder,
} = require('../controllers/paymentController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

// All payment routes require valid JWT with tenantId + branchId
router.use(protect, requireTenant);

// Initiate payment (lock order)
router.post('/:orderId/initiate', authorize('cashier', 'admin', 'superadmin'), initiatePayment);

// Cancel initiated payment (unlock order)
router.post('/:orderId/cancel', authorize('cashier', 'admin', 'superadmin'), cancelPayment);

// Process payment (execute)
router.post('/:orderId/process', authorize('cashier', 'admin', 'superadmin'), processPayment);

// Get payment record for an order
router.get('/:orderId', authorize('cashier', 'admin', 'superadmin'), getPaymentByOrder);

module.exports = router;
