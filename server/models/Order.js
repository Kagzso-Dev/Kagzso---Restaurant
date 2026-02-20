const mongoose = require('mongoose');
const Counter = require('./Counter');

const orderSchema = new mongoose.Schema({
    orderNumber: { type: String },
    tokenNumber: { type: Number, index: true },
    orderType: { type: String, enum: ['dine-in', 'takeaway'], required: true },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    customerInfo: {
        name: { type: String },
        phone: { type: String },
    },
    items: [
        {
            menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
            name: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true, default: 1 },
            notes: { type: String },
            status: {
                type: String,
                enum: ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'],
                default: 'PENDING'
            },
            cancelledBy: { type: String, enum: ['WAITER', 'KITCHEN'] },
            cancelReason: { type: String },
            cancelledAt: { type: Date }
        }
    ],
    orderStatus: {
        type: String,
        enum: ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid'],
        default: 'pending'
    },
    kotStatus: {
        type: String,
        enum: ['Open', 'Closed'],
        default: 'Open',
        index: true
    },
    totalAmount: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
    // Multi-tenant fields
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    cancelledBy: { type: String, enum: ['WAITER', 'KITCHEN', 'ADMIN'] },
    cancelReason: { type: String },
}, { timestamps: true });

// Compound index for fast tenant+branch order queries
orderSchema.index({ tenantId: 1, branchId: 1, orderStatus: 1 });
orderSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });

// Auto-increment Token Number per tenant+branch
orderSchema.pre('save', async function () {
    if (!this.isNew) return;

    try {
        // Counter key is scoped per tenant+branch for isolation
        const counterKey = `tokenNumber_${this.tenantId}_${this.branchId}`;
        const counter = await Counter.findOneAndUpdate(
            { _id: counterKey },
            { $inc: { sequence_value: 1 } },
            { returnDocument: 'after', upsert: true }
        );
        this.tokenNumber = counter.sequence_value;
        this.orderNumber = `ORD-${counter.sequence_value}`;
    } catch (error) {
        throw error;
    }
});

module.exports = mongoose.model('Order', orderSchema);
