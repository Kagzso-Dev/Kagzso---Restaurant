const Table = require('../models/Table');

// ─── VALID STATUS TRANSITIONS ────────────────────────────────────────────────
// Prevents invalid state changes (e.g. jumping from 'cleaning' to 'billing')
const VALID_TRANSITIONS = {
    available: ['reserved'],
    reserved: ['occupied', 'available'],  // occupied when order placed, available on cancel/timeout
    occupied: ['billing'],
    billing: ['cleaning'],                // after payment
    cleaning: ['available'],              // after manual clean confirm
};

// @desc    Get all tables for this branch
// @route   GET /api/tables
// @access  Private
const getTables = async (req, res) => {
    try {
        const tables = await Table.find({
            tenantId: req.tenantId,
            branchId: req.branchId,
        }).sort({ number: 1 });
        res.json(tables);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a table
// @route   POST /api/tables
// @access  Private (Admin)
const createTable = async (req, res) => {
    const { number, capacity } = req.body;

    try {
        const tableExists = await Table.findOne({
            number,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });
        if (tableExists) {
            return res.status(400).json({ message: 'Table number already exists in this branch' });
        }

        const table = await Table.create({
            number,
            capacity,
            status: 'available',
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        res.status(201).json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update table (generic — kept for backward compat)
// @route   PUT /api/tables/:id
// @access  Private (Admin, Waiter, Cashier)
const updateTable = async (req, res) => {
    const { status } = req.body;

    try {
        const table = await Table.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Validate transition if status is changing
        if (status && status !== table.status) {
            const allowed = VALID_TRANSITIONS[table.status];
            if (!allowed || !allowed.includes(status)) {
                return res.status(400).json({
                    message: `Cannot change table from "${table.status}" to "${status}"`,
                });
            }
        }

        if (status) table.status = status;
        if (status === 'available') {
            table.lockedBy = null;
            table.reservedAt = null;
            table.currentOrderId = null;
        }

        await table.save();

        req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
            tableId: table._id,
            status: table.status,
            lockedBy: table.lockedBy,
        });

        res.json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reserve a table (Waiter only)
// @route   PUT /api/tables/:id/reserve
// @access  Private (Waiter, Admin)
const reserveTable = async (req, res) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Double booking prevention
        if (table.status !== 'available') {
            return res.status(400).json({
                message: `Table is currently "${table.status}" and cannot be reserved`,
            });
        }

        table.status = 'reserved';
        table.lockedBy = req.user._id;
        table.reservedAt = new Date();
        await table.save();

        req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
            tableId: table._id,
            status: 'reserved',
            lockedBy: table.lockedBy,
        });

        res.json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Release a reserved table back to available
// @route   PUT /api/tables/:id/release
// @access  Private (Waiter, Admin)
const releaseTable = async (req, res) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        if (table.status !== 'reserved') {
            return res.status(400).json({
                message: `Table is "${table.status}", only reserved tables can be released`,
            });
        }

        table.status = 'available';
        table.lockedBy = null;
        table.reservedAt = null;
        table.currentOrderId = null;
        await table.save();

        req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
            tableId: table._id,
            status: 'available',
        });

        res.json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark table as cleaned → available
// @route   PUT /api/tables/:id/clean
// @access  Private (Waiter, Admin)
const markTableClean = async (req, res) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        if (table.status !== 'cleaning') {
            return res.status(400).json({
                message: `Table is "${table.status}", only tables in "cleaning" can be marked clean`,
            });
        }

        table.status = 'available';
        table.lockedBy = null;
        table.reservedAt = null;
        table.currentOrderId = null;
        await table.save();

        req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
            tableId: table._id,
            status: 'available',
        });

        res.json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Force reset table to available (Admin only)
// @route   PUT /api/tables/:id/force-reset
// @access  Private (Admin only)
const forceResetTable = async (req, res) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        table.status = 'available';
        table.lockedBy = null;
        table.reservedAt = null;
        table.currentOrderId = null;
        await table.save();

        req.app.get('socketio').to(`branch_${req.branchId}`).emit('table-updated', {
            tableId: table._id,
            status: 'available',
        });

        res.json({ message: 'Table force-reset to available', table });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Private (Admin)
const deleteTable = async (req, res) => {
    try {
        const table = await Table.findOne({
            _id: req.params.id,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });

        if (!table) {
            return res.status(404).json({ message: 'Table not found' });
        }

        // Prevent deleting table that has an active session
        if (table.status !== 'available') {
            return res.status(400).json({
                message: `Cannot delete table while status is "${table.status}". Reset it first.`,
            });
        }

        await table.deleteOne();
        res.json({ message: 'Table removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── AUTO-RELEASE: Called by setInterval in server.js ────────────────────────
// Releases tables that have been "reserved" for longer than 10 minutes
// without any order being placed.
const autoReleaseExpiredReservations = async (io) => {
    const TEN_MINUTES = 10 * 60 * 1000;
    const cutoff = new Date(Date.now() - TEN_MINUTES);

    try {
        const expiredTables = await Table.find({
            status: 'reserved',
            reservedAt: { $lt: cutoff },
            currentOrderId: null, // No order was placed
        });

        for (const table of expiredTables) {
            table.status = 'available';
            table.lockedBy = null;
            table.reservedAt = null;
            await table.save();

            // Emit socket event for real-time UI update
            if (io) {
                io.to(`branch_${table.branchId}`).emit('table-updated', {
                    tableId: table._id,
                    status: 'available',
                });
            }

            console.log(`Auto-released table ${table.number} (branch: ${table.branchId}) — 10min timeout`);
        }
    } catch (error) {
        console.error('Auto-release error:', error.message);
    }
};

module.exports = {
    getTables,
    createTable,
    updateTable,
    reserveTable,
    releaseTable,
    markTableClean,
    forceResetTable,
    deleteTable,
    autoReleaseExpiredReservations,
};
