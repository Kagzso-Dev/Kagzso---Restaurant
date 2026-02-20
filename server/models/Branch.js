const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    address: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
    },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Compound index for fast lookups
branchSchema.index({ tenantId: 1, name: 1 });

module.exports = mongoose.model('Branch', branchSchema);
