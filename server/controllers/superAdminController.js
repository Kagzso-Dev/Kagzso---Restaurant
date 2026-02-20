const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ─── TENANT MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/superadmin/tenants
const getAllTenants = async (req, res) => {
    try {
        const tenants = await Tenant.find().sort({ createdAt: -1 });
        res.json(tenants);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/superadmin/tenants
const createTenant = async (req, res) => {
    try {
        const { name, subdomain, subscriptionPlan, maxBranches } = req.body;

        if (!name) return res.status(400).json({ message: 'Tenant name is required' });

        const tenant = await Tenant.create({ name, subdomain, subscriptionPlan, maxBranches });
        res.status(201).json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/superadmin/tenants/:id
const updateTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        res.json(tenant);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/superadmin/tenants/:id
const deleteTenant = async (req, res) => {
    try {
        const tenant = await Tenant.findByIdAndDelete(req.params.id);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
        res.json({ message: 'Tenant deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── BRANCH MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/superadmin/tenants/:tenantId/branches
const getBranches = async (req, res) => {
    try {
        const branches = await Branch.find({ tenantId: req.params.tenantId });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/superadmin/tenants/:tenantId/branches
const createBranch = async (req, res) => {
    try {
        const { tenantId } = req.params;
        const { name, address, phone } = req.body;

        // Check branch limit
        const tenant = await Tenant.findById(tenantId);
        if (!tenant) return res.status(404).json({ message: 'Tenant not found' });

        const branchCount = await Branch.countDocuments({ tenantId });
        if (branchCount >= tenant.maxBranches) {
            return res.status(400).json({
                message: `Branch limit reached (max: ${tenant.maxBranches}). Upgrade subscription.`
            });
        }

        const branch = await Branch.create({ name, address, phone, tenantId });
        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PUT /api/superadmin/branches/:id
const updateBranch = async (req, res) => {
    try {
        const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!branch) return res.status(404).json({ message: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─── ADMIN USER SEEDING ───────────────────────────────────────────────────────

// POST /api/superadmin/tenants/:tenantId/branches/:branchId/seed-admin
// Creates the first admin user for a new tenant branch
const seedBranchAdmin = async (req, res) => {
    try {
        const { tenantId, branchId } = req.params;
        const { username, password } = req.body;

        const existing = await User.findOne({ username, tenantId });
        if (existing) return res.status(400).json({ message: 'Admin user already exists' });

        const salt = await bcrypt.genSalt(10);
        const user = await User.create({
            username,
            password: await bcrypt.hash(password, salt),
            role: 'admin',
            tenantId,
            branchId,
        });

        res.status(201).json({ _id: user._id, username: user.username, role: user.role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/superadmin/stats
const getStats = async (req, res) => {
    try {
        const [tenantCount, branchCount, userCount] = await Promise.all([
            Tenant.countDocuments(),
            Branch.countDocuments(),
            User.countDocuments({ role: { $ne: 'superadmin' } }),
        ]);
        res.json({ tenants: tenantCount, branches: branchCount, users: userCount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    getBranches,
    createBranch,
    updateBranch,
    seedBranchAdmin,
    getStats,
};
