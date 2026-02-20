const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
}, { timestamps: true });

// Unique category name per branch
categorySchema.index({ name: 1, tenantId: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
