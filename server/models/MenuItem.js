const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    image: { type: String },
    availability: { type: Boolean, default: true },
    isVeg: { type: Boolean, default: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
}, { timestamps: true });

// Compound index for fast tenant+branch menu queries
menuItemSchema.index({ tenantId: 1, branchId: 1, availability: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
