const Order = require('../models/Order');
const Table = require('../models/Table');
const { createAndEmitNotification } = require('./notificationController');
const { invalidateCache } = require('../utils/cache');

// @desc    Get all orders (filtered by tenant + branch)
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 50, kotStatus, status } = req.query;

        const filter = {
            tenantId: req.tenantId,
            branchId: req.branchId,
        };

        // KOT Filtering for Kitchen Display
        if (kotStatus) {
            filter.kotStatus = kotStatus === 'Open' ? { $ne: 'Closed' } : kotStatus;
        }

        // Specific order status filter (e.g., active orders only)
        if (status) {
            filter.orderStatus = status;
        }

        // Kitchen only sees active (non-completed/paid) orders if no specific KOT status requested
        if (req.role === 'kitchen' && !kotStatus) {
            filter.orderStatus = { $in: ['pending', 'accepted', 'preparing', 'ready'] };
        }

        // Optimization: For Kitchen/Active views, we usually don't paginate strictly 
        // to ensure real-time consistency. For history, we do.
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Fetch paginated results and total count in parallel for speed
        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('tableId', 'number')
                .lean(), // lean() makes it faster by returning POJOs
            Order.countDocuments(filter)
        ]);

        res.json({
            orders,
            pagination: {
                total,
                page: parseInt(page),
                pages: Math.ceil(total / limit),
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new order (auto-attach tenantId + branchId)
// @route   POST /api/orders
// @access  Private (Waiter, Cashier, Admin)
const createOrder = async (req, res) => {
    const {
        orderType,
        tableId,
        customerInfo,
        items,
        totalAmount,
        tax,
        discount,
        finalAmount,
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    try {
        const order = new Order({
            orderType,
            tableId,
            customerInfo,
            items,
            totalAmount,
            tax,
            discount,
            finalAmount,
            // Auto-attach from JWT — no client can fake this
            tenantId: req.tenantId,
            branchId: req.branchId,
            waiterId: req.userId, // Track which waiter/user created this order
        });

        // If Dine-In, validate table status before creating order
        if (orderType === 'dine-in' && tableId) {
            const table = await Table.findOne({
                _id: tableId,
                tenantId: req.tenantId,
                branchId: req.branchId,
            });
            if (!table) {
                return res.status(404).json({ message: 'Table not found' });
            }
            // Only allow booking if table is available or reserved (by this waiter)
            if (!['available', 'reserved'].includes(table.status)) {
                return res.status(400).json({
                    message: `Table is currently "${table.status}" and cannot be booked`,
                });
            }
        }

        const createdOrder = await order.save();

        // If Dine-In, transition table → occupied
        if (orderType === 'dine-in' && tableId) {
            const table = await Table.findOne({
                _id: tableId,
                tenantId: req.tenantId,
                branchId: req.branchId,
            });
            if (table) {
                table.status = 'occupied';
                table.currentOrderId = createdOrder._id;
                table.reservedAt = null; // Clear reservation timestamp
                await table.save();
                req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
                    tableId: table._id,
                    status: 'occupied',
                    lockedBy: table.lockedBy,
                });
            }
        }

        // Emit new order to Kitchen (room-based for branch isolation)
        const room = `branch_${req.branchId}`;
        req.app.get('socketio').to(room).emit('new-order', createdOrder);

        // ── Auto-notify kitchen: NEW_ORDER ──
        createAndEmitNotification(req.app.get('socketio'), {
            title: `New Order #${createdOrder.orderNumber}`,
            message: `${createdOrder.items.length} item(s) — ${createdOrder.orderType === 'dine-in' ? 'Dine-In' : 'Takeaway'}`,
            type: 'NEW_ORDER',
            roleTarget: 'kitchen',
            referenceId: createdOrder._id,
            referenceType: 'order',
            tenantId: req.tenantId,
            branchId: req.branchId,
            createdBy: req.userId,
        });

        // ── Cache: Invalidate dashboard/analytics ──
        invalidateCache('dashboard');
        invalidateCache('analytics');

        res.status(201).json(createdOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Kitchen, Admin, Cashier)
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const orderId = req.params.id;

    try {
        // Always filter by tenantId + branchId to prevent cross-tenant access
        const order = await Order.findOne({
            _id: orderId,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Role-based validation
        if (req.role === 'kitchen' && status === 'completed') {
            return res.status(403).json({ message: 'Kitchen cannot mark orders as completed' });
        }

        if (status === 'cancelled') {
            if (['preparing', 'ready'].includes(order.orderStatus) && !['admin', 'superadmin'].includes(req.role)) {
                return res.status(403).json({ message: 'Only admin can cancel after preparation starts' });
            }
        }

        // Check Auto-Close KOT Logic
        // IF orderStatus === "Completed" AND paymentStatus === "Paid"
        if (status === 'completed' && order.paymentStatus === 'paid') {
            order.kotStatus = 'Closed';

            // Also ensure table transitions to cleaning if applicable
            if (order.orderType === 'dine-in' && order.tableId) {
                const table = await Table.findOne({
                    _id: order.tableId,
                    tenantId: req.tenantId,
                    branchId: req.branchId,
                });
                if (table) {
                    table.status = 'cleaning';
                    table.currentOrderId = null;
                    await table.save();
                    req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
                        tableId: table._id,
                        status: 'cleaning',
                    });
                }
            }
        }

        // Analytics: Track status transition timestamps
        if (status === 'preparing' && !order.prepStartedAt) {
            order.prepStartedAt = new Date();
        } else if (status === 'ready' && !order.readyAt) {
            order.readyAt = new Date();
        } else if (status === 'completed' && !order.completedAt) {
            order.completedAt = new Date();
        }

        order.orderStatus = status;
        const updatedOrder = await order.save();

        const room = `branch_${req.branchId}`;
        req.app.get('socketio').to(room).emit('order-updated', updatedOrder);

        // ── Auto-notify waiter: ORDER_READY ──
        if (status === 'ready') {
            createAndEmitNotification(req.app.get('socketio'), {
                title: `Order #${order.orderNumber} Ready`,
                message: `Order is ready for pickup/serving`,
                type: 'ORDER_READY',
                roleTarget: 'waiter',
                referenceId: order._id,
                referenceType: 'order',
                tenantId: req.tenantId,
                branchId: req.branchId,
                createdBy: req.userId,
            });
        }

        // ── Cache: Invalidate dashboard/analytics ──
        invalidateCache('dashboard');
        invalidateCache('analytics');

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update individual item status (KOT item-level)
// @route   PUT /api/orders/:id/items/:itemId/status
// @access  Private (Kitchen, Admin)
const updateItemStatus = async (req, res) => {
    const { status } = req.body;
    const { id, itemId } = req.params;

    try {
        const order = await Order.findOne({
            _id: id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        if (item.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Cannot update status of a cancelled item' });
        }

        item.status = status;
        await order.save();

        const room = `branch_${req.branchId}`;
        req.app.get('socketio').to(room).emit('itemUpdated', order);
        req.app.get('socketio').to(room).emit('order-updated', order);

        // ── Cache: Invalidate dashboard/analytics ──
        invalidateCache('dashboard');
        invalidateCache('analytics');

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process payment
// @route   PUT /api/orders/:id/payment
// @access  Private (Cashier, Admin)
const processPayment = async (req, res) => {
    const { paymentMethod, amountPaid } = req.body;
    const orderId = req.params.id;

    try {
        const order = await Order.findOne({
            _id: orderId,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Prevent double payment — return success with order if already paid
        if (order.paymentStatus === 'paid') {
            return res.json({
                success: true,
                message: 'Payment already processed',
                order,
            });
        }

        // ── Kitchen-completion gate: block unless order is ready ──
        if (order.orderStatus !== 'ready') {
            return res.status(400).json({
                message: 'Payment not allowed. Kitchen process not completed.',
            });
        }

        // Auto-Close: Payment triggers full completion
        order.paymentStatus = 'paid';
        order.paymentMethod = paymentMethod || 'cash';
        order.orderStatus = 'completed';
        order.kotStatus = 'Closed';
        order.paymentAt = new Date();
        order.paidAt = new Date();
        order.completedAt = order.completedAt || new Date();

        await order.save();

        // Table lifecycle: occupied → billing → cleaning
        // Payment moves table to "cleaning" (needs manual clean confirmation)
        if (order.orderType === 'dine-in' && order.tableId) {
            const table = await Table.findOne({
                _id: order.tableId,
                tenantId: req.tenantId,
                branchId: req.branchId,
            });
            if (table) {
                table.status = 'cleaning';
                table.currentOrderId = null;
                await table.save();
                req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
                    tableId: table._id,
                    status: 'cleaning',
                });
            }
        }

        const room = `branch_${req.branchId}`;
        // Emit both events so all listeners catch it
        req.app.get('socketio').to(room).emit('order-updated', order);
        req.app.get('socketio').to(room).emit('order-completed', order);

        res.json({
            success: true,
            message: 'Payment successful & token closed',
            order,
        });

        // ── Cache: Invalidate dashboard/analytics ──
        invalidateCache('dashboard');
        invalidateCache('analytics');
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private (Waiter, Kitchen, Admin)
const cancelOrder = async (req, res) => {
    const { reason } = req.body;
    const orderId = req.params.id;

    try {
        const order = await Order.findOne({
            _id: orderId,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Prevent updating already completed or cancelled orders
        if (['completed', 'cancelled'].includes(order.orderStatus)) {
            return res.status(400).json({ message: `Cannot cancel an order that is already ${order.orderStatus}` });
        }

        // Role-based validation
        if (req.role === 'waiter') {
            if (order.orderStatus !== 'pending') {
                return res.status(403).json({ message: 'Waiters can only cancel pending orders' });
            }
        } else if (req.role === 'kitchen') {
            // Kitchen can cancel PENDING or COOKING (accepted/preparing)
            if (!['pending', 'accepted', 'preparing'].includes(order.orderStatus)) {
                return res.status(403).json({ message: 'Kitchen can only cancel orders that are pending or being prepared' });
            }
        } else if (!['admin', 'superadmin'].includes(req.role)) {
            // Cashier or other roles
            return res.status(403).json({ message: 'Your role is not authorized to cancel orders' });
        }
        // Admin and SuperAdmin can cancel anytime

        order.orderStatus = 'cancelled';
        order.kotStatus = 'Closed';
        order.cancelledBy = req.role.toUpperCase();
        order.cancelReason = reason || 'No reason provided';

        // Release table if dine-in
        if (order.orderType === 'dine-in' && order.tableId) {
            const table = await Table.findOne({
                _id: order.tableId,
                tenantId: req.tenantId,
                branchId: req.branchId,
            });
            if (table) {
                // Return table to available status
                table.status = 'available';
                table.currentOrderId = null;
                await table.save();

                // Emit table update
                req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
                    tableId: table._id,
                    status: 'available',
                });
            }
        }

        const updatedOrder = await order.save();
        const room = `branch_${req.branchId}`;

        // Emit required socket events
        req.app.get('socketio').to(room).emit('orderCancelled', updatedOrder);
        req.app.get('socketio').to(room).emit('order-updated', updatedOrder);

        // ── Cache: Invalidate dashboard/analytics ──
        invalidateCache('dashboard');
        invalidateCache('analytics');

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel individual item from order
// @route   PUT /api/orders/:orderId/items/:itemId/cancel
// @access  Private (Waiter, Kitchen)
const cancelOrderItem = async (req, res) => {
    const { id: orderId, itemId } = req.params;
    const { reason } = req.body;

    try {
        const order = await Order.findOne({
            _id: orderId,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const item = order.items.id(itemId);
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        const currentStatus = item.status?.toUpperCase();

        if (currentStatus === 'CANCELLED') {
            return res.status(400).json({ message: 'Item is already cancelled' });
        }

        // Waiter can only cancel if NOT preparing or ready
        if (req.role === 'waiter') {
            if (['PREPARING', 'READY'].includes(currentStatus)) {
                return res.status(403).json({ message: 'Waiters cannot cancel items that are preparing or ready' });
            }
        }
        // Kitchen, Admin, and SuperAdmin can cancel anytime


        // Update item fields
        item.status = 'CANCELLED';
        item.cancelledBy = req.role.toUpperCase();
        item.cancelReason = reason || 'Item cancelled';
        item.cancelledAt = new Date();

        // Recalculate totals (Exclude cancelled items)
        const activeItems = order.items.filter(i => i.status !== 'CANCELLED');

        // Update subtotal
        const newTotalAmount = activeItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        // Adjust tax proportionally if it exists
        if (order.totalAmount > 0) {
            const taxRate = order.tax / order.totalAmount;
            order.tax = Math.round(newTotalAmount * taxRate * 100) / 100;
        }

        order.totalAmount = newTotalAmount;
        order.finalAmount = order.totalAmount + order.tax - order.discount;

        // Order Status Logic
        if (activeItems.length === 0) {
            order.orderStatus = 'cancelled';
            order.kotStatus = 'Closed';

            // Release table if dine-in
            if (order.orderType === 'dine-in' && order.tableId) {
                const table = await Table.findOne({
                    _id: order.tableId,
                    tenantId: req.tenantId,
                    branchId: req.branchId,
                });
                if (table) {
                    table.status = 'available';
                    table.currentOrderId = null;
                    await table.save();
                    req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
                        tableId: table._id,
                        status: 'available',
                    });
                }
            }
        }

        const updatedOrder = await order.save();
        const room = `branch_${req.branchId}`;

        // Sync real-time across all relevant clients
        req.app.get('socketio').to(room).emit('itemUpdated', updatedOrder);
        req.app.get('socketio').to(room).emit('order-updated', updatedOrder);

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search orders by orderNumber, customerName, or tableNumber
// @route   GET /api/orders/search?q=<query>
// @access  Private (admin, cashier, waiter)
const searchOrders = async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q) {
            return res.json({ orders: [] });
        }

        // Escape special regex characters to prevent injection
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');

        // Base tenant+branch filter — always enforced
        const baseFilter = {
            tenantId: req.tenantId,
            branchId: req.branchId,
        };

        // Multi-field regex search
        // Table search: Convert Number field to String for regex matching using aggregation
        const matchingTables = await Table.aggregate([
            {
                $match: {
                    tenantId: new mongoose.Types.ObjectId(req.tenantId),
                    branchId: new mongoose.Types.ObjectId(req.branchId),
                }
            },
            {
                $addFields: {
                    numberString: { $toString: "$number" }
                }
            },
            {
                $match: {
                    numberString: { $regex: regex }
                }
            },
            { $project: { _id: 1 } }
        ]);
        const tableIds = matchingTables.map(t => t._id);

        const orders = await Order.find({
            ...baseFilter,
            $or: [
                { orderNumber: { $regex: regex } },
                { 'customerInfo.name': { $regex: regex } },
                ...(tableIds.length ? [{ tableId: { $in: tableIds } }] : []),
            ],
        })
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('tableId', 'number')
            .lean();

        res.json({ orders });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createOrder,
    getOrders,
    searchOrders,
    updateOrderStatus,
    updateItemStatus,
    processPayment,
    cancelOrder,
    cancelOrderItem,
};
