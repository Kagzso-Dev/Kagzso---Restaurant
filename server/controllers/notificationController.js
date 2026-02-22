const Notification = require('../models/Notification');

// ─── Helper: emit notification to role-specific room ──────────────────────────
const emitNotification = (io, branchId, roleTarget, notification) => {
    const room = `branch_${branchId}`;
    // Emit to the branch room with role info — clients filter by their own role
    io.to(room).emit('new-notification', {
        notification,
        roleTarget,
    });
};

// ─── Helper: create + emit a notification ─────────────────────────────────────
const createAndEmitNotification = async (io, data) => {
    try {
        // Duplicate check: prevent same type + referenceId within branch
        if (data.referenceId) {
            const existing = await Notification.findOne({
                tenantId: data.tenantId,
                branchId: data.branchId,
                type: data.type,
                referenceId: data.referenceId,
            });
            if (existing) return existing;
        }

        const notification = await Notification.create(data);
        emitNotification(io, data.branchId, data.roleTarget, notification);

        // For 'all' target, emit once (clients will match role === 'all')
        return notification;
    } catch (err) {
        console.error('[Notification] Create error:', err.message);
        return null;
    }
};

/**
 * @desc    Get notifications for current user's role
 * @route   GET /api/notifications
 * @query   ?page=1&limit=20&unread=true
 * @access  Private
 */
const getNotifications = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const unreadOnly = req.query.unread === 'true';

        const userRole = req.role;
        const userId = req.userId;

        // Build filter: role-targeted notifications OR 'all' broadcasts
        const filter = {
            tenantId: req.tenantId,
            branchId: req.branchId,
            $or: [
                { roleTarget: userRole },
                { roleTarget: 'all' },
            ],
        };

        // For individual read-tracking, check against readBy array
        if (unreadOnly) {
            filter['readBy.userId'] = { $ne: userId };
        }

        const [notifications, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(filter),
        ]);

        // Mark each notification with user-specific read status
        const enriched = notifications.map(n => ({
            ...n,
            isRead: n.readBy?.some(r => r.userId?.toString() === userId) || false,
        }));

        res.json({
            success: true,
            notifications: enriched,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error('[Notification] GET error:', err);
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

/**
 * @desc    Get unread count for current user's role
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            tenantId: req.tenantId,
            branchId: req.branchId,
            $or: [
                { roleTarget: req.role },
                { roleTarget: 'all' },
            ],
            'readBy.userId': { $ne: req.userId },
        });

        res.json({ success: true, count });
    } catch (err) {
        console.error('[Notification] Unread count error:', err);
        res.status(500).json({ message: 'Failed to get unread count' });
    }
};

/**
 * @desc    Mark specific notification(s) as read
 * @route   PUT /api/notifications/read
 * @body    { notificationIds: [id1, id2, ...] }
 * @access  Private
 */
const markAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;

        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            return res.status(400).json({ message: 'notificationIds array is required' });
        }

        // Add user to readBy for each notification (if not already there)
        await Notification.updateMany(
            {
                _id: { $in: notificationIds },
                tenantId: req.tenantId,
                branchId: req.branchId,
                'readBy.userId': { $ne: req.userId },
            },
            {
                $addToSet: {
                    readBy: { userId: req.userId, readAt: new Date() },
                },
            }
        );

        // Emit read-sync event so other devices update
        const room = `branch_${req.branchId}`;
        req.app.get('socketio').to(room).emit('notifications-read', {
            notificationIds,
            userId: req.userId,
            role: req.role,
        });

        res.json({ success: true, message: 'Notifications marked as read' });
    } catch (err) {
        console.error('[Notification] Mark read error:', err);
        res.status(500).json({ message: 'Failed to mark notifications as read' });
    }
};

/**
 * @desc    Mark ALL notifications as read for current user
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            {
                tenantId: req.tenantId,
                branchId: req.branchId,
                $or: [
                    { roleTarget: req.role },
                    { roleTarget: 'all' },
                ],
                'readBy.userId': { $ne: req.userId },
            },
            {
                $addToSet: {
                    readBy: { userId: req.userId, readAt: new Date() },
                },
            }
        );

        // Emit read-sync
        const room = `branch_${req.branchId}`;
        req.app.get('socketio').to(room).emit('notifications-read-all', {
            userId: req.userId,
            role: req.role,
        });

        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
        console.error('[Notification] Mark all read error:', err);
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
};

/**
 * @desc    Create an offer/announcement notification (admin only)
 * @route   POST /api/notifications/offer
 * @body    { title, message, roleTarget }
 * @access  Private (admin, superadmin)
 */
const createOfferNotification = async (req, res) => {
    try {
        const { title, message, roleTarget } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const validTargets = ['kitchen', 'admin', 'waiter', 'cashier', 'all'];
        const target = validTargets.includes(roleTarget) ? roleTarget : 'all';

        const notification = await Notification.create({
            title: title.trim(),
            message: message.trim(),
            type: 'OFFER_ANNOUNCEMENT',
            roleTarget: target,
            tenantId: req.tenantId,
            branchId: req.branchId,
            createdBy: req.userId,
        });

        const io = req.app.get('socketio');
        emitNotification(io, req.branchId, target, notification);

        res.status(201).json({
            success: true,
            message: 'Offer notification sent',
            notification,
        });
    } catch (err) {
        console.error('[Notification] Offer create error:', err);
        res.status(500).json({ message: 'Failed to create offer notification' });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    createOfferNotification,
    createAndEmitNotification,
    emitNotification,
};
