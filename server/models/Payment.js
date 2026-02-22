const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true,
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'qr', 'upi', 'credit_card'],
        required: true,
    },
    transactionId: {
        type: String,
        default: null,
        trim: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    amountReceived: {
        type: Number,
        default: 0,
        min: 0,
    },
    change: {
        type: Number,
        default: 0,
        min: 0,
    },
    cashierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    // Multi-tenant fields
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        required: true,
        index: true,
    },
}, { timestamps: true });

// Prevent duplicate payments per order (one payment per order)
paymentSchema.index({ orderId: 1 }, { unique: true });

// Fast lookups for analytics
paymentSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
paymentSchema.index({ tenantId: 1, branchId: 1, paymentMethod: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
