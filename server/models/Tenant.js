const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    subdomain: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    subscriptionPlan: {
        type: String,
        enum: ['free', 'basic', 'pro', 'enterprise'],
        default: 'basic'
    },
    maxBranches: { type: Number, default: 3 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Tenant', tenantSchema);
