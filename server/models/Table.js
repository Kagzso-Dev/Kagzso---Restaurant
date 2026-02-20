const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
    number: { type: Number, required: true },
    capacity: { type: Number, required: true },
    status: {
        type: String,
        enum: ['available', 'reserved', 'occupied', 'billing', 'cleaning'],
        default: 'available',
        index: true,
    },
    currentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reservedAt: { type: Date, default: null },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
}, { timestamps: true });

// Table number unique per branch (not globally)
tableSchema.index({ number: 1, tenantId: 1, branchId: 1 }, { unique: true });
// Fast lookup for auto-release query
tableSchema.index({ status: 1, reservedAt: 1 });

module.exports = mongoose.model('Table', tableSchema);
