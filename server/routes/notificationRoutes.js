const express = require('express');
const router = express.Router();
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createOfferNotification,
} = require('../controllers/notificationController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');

// All notification routes require authentication + tenant context
router.use(protect, requireTenant);

// ── Read routes (all roles) ──────────────────────────────────────────────────
router.get('/', authorize('admin', 'waiter', 'kitchen', 'cashier', 'superadmin'), getNotifications);
router.get('/unread-count', authorize('admin', 'waiter', 'kitchen', 'cashier', 'superadmin'), getUnreadCount);

// ── Write routes ─────────────────────────────────────────────────────────────
router.put('/read', authorize('admin', 'waiter', 'kitchen', 'cashier', 'superadmin'), markAsRead);
router.put('/read-all', authorize('admin', 'waiter', 'kitchen', 'cashier', 'superadmin'), markAllAsRead);

// ── Admin-only: offer/announcement ─────────────────────────────────────────
router.post('/offer', authorize('admin', 'superadmin'), createOfferNotification);

module.exports = router;
