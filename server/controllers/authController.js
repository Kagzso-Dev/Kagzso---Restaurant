const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * Generate JWT with full multi-tenant context embedded.
 * This is the ONLY place tokens are minted — no hardcoded IDs.
 */
const generateToken = ({ userId, tenantId, branchId, role }) => {
    return jwt.sign(
        { userId, tenantId, branchId, role },
        process.env.JWT_SECRET,
        { expiresIn: '30d', issuer: 'KOT_AUTH' }
    );
};

// @desc    Register a new user (Admin creates staff for their tenant)
// @route   POST /api/auth/register
// @access  Private (Admin, SuperAdmin)
const registerUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Determine tenantId + branchId context
        // SuperAdmin can pass explicit tenantId/branchId in body
        // Admin uses their own tenantId/branchId from JWT
        let tenantId = req.tenantId;
        let branchId = req.branchId;

        if (req.role === 'superadmin') {
            tenantId = req.body.tenantId;
            branchId = req.body.branchId;
        }

        if (!tenantId || !branchId) {
            return res.status(400).json({ message: 'tenantId and branchId are required' });
        }

        // Prevent creating superadmin via this route
        if (role === 'superadmin') {
            return res.status(403).json({ message: 'Cannot create superadmin via this route' });
        }

        // Username unique per tenant
        const userExists = await User.findOne({ username, tenantId });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists in this tenant' });
        }

        const user = await User.create({
            username,
            password, // Plan password: pre-save hook will hash it
            role,
            tenantId,
            branchId,
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId,
            branchId: user.branchId,
            token: generateToken({
                userId: user._id,
                tenantId: user.tenantId,
                branchId: user.branchId,
                role: user.role,
            }),
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;

        // SuperAdmin has no tenantId — find by username + role
        // Regular users: find by username (could exist in multiple tenants — require tenantId or subdomain in future)
        // For now: find first match by username
        const user = await User.findOne({ username })
            .populate('tenantId', 'name isActive subscriptionPlan')
            .populate('branchId', 'name isActive');

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Block login if tenant or branch is deactivated
        if (user.role !== 'superadmin') {
            if (!user.tenantId || !user.tenantId.isActive) {
                return res.status(403).json({ message: 'Tenant account is inactive' });
            }
            if (!user.branchId || !user.branchId.isActive) {
                return res.status(403).json({ message: 'Branch is inactive' });
            }
        }

        const token = generateToken({
            userId: user._id,
            tenantId: user.tenantId?._id || null,
            branchId: user.branchId?._id || null,
            role: user.role,
        });

        res.json({
            _id: user._id,
            username: user.username,
            role: user.role,
            tenantId: user.tenantId?._id || null,
            branchId: user.branchId?._id || null,
            tenantName: user.tenantId?.name || null,
            branchName: user.branchId?.name || null,
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-password')
            .populate('tenantId', 'name subscriptionPlan')
            .populate('branchId', 'name address');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getMe };
