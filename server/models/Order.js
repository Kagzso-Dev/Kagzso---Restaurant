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
        enum: ['pending', 'payment_pending', 'paid'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'qr', 'upi', 'credit_card'],
        default: null,
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

    // Analytics Tracking Fields
    waiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    prepStartedAt: { type: Date },
    readyAt: { type: Date },
    completedAt: { type: Date },
    paymentAt: { type: Date },
    paidAt: { type: Date },

    cancelledBy: { type: String, enum: ['WAITER', 'KITCHEN', 'ADMIN'] },
    cancelReason: { type: String },
}, { timestamps: true });

// Analytics-specific indexes for scalability
orderSchema.index({ branchId: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, createdAt: -1 });
orderSchema.index({ waiterId: 1, createdAt: -1 });
orderSchema.index({ branchId: 1, orderStatus: 1, createdAt: -1 });

// Compound index for fast tenant+branch order queries
orderSchema.index({ tenantId: 1, branchId: 1, orderStatus: 1 });
orderSchema.index({ tenantId: 1, branchId: 1, createdAt: -1 });
// Kitchen: fast open KOT lookup
orderSchema.index({ tenantId: 1, branchId: 1, kotStatus: 1 });
// Table history: fast lookup by table
orderSchema.index({ tenantId: 1, branchId: 1, tableId: 1 });
// Search: fast lookup by orderNumber
orderSchema.index({ tenantId: 1, branchId: 1, orderNumber: 1 });
// Search: text index for order number + customer name (MongoDB text search)
orderSchema.index({ orderNumber: 'text', 'customerInfo.name': 'text' });
// Growth: fast revenue aggregation by paymentStatus + date
orderSchema.index({ tenantId: 1, branchId: 1, paymentStatus: 1, createdAt: -1 });

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
