const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    restaurantName: { type: String, default: 'My Restaurant' },
    currency: { type: String, default: 'USD' },
    currencySymbol: { type: String, default: '$' },
    taxRate: { type: Number, default: 5 },
    gstNumber: { type: String, default: '' },
    // Multi-tenant: settings are per tenant+branch
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
}, { timestamps: true });

// One settings doc per branch
settingSchema.index({ tenantId: 1, branchId: 1 }, { unique: true });

module.exports = mongoose.model('Setting', settingSchema);
