const Setting = require('../models/Setting');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Helper: get or create settings for this branch
const getOrInitSettings = async (tenantId, branchId) => {
    let settings = await Setting.findOne({ tenantId, branchId });
    if (!settings) {
        settings = await Setting.create({
            restaurantName: 'My Restaurant',
            currency: 'USD',
            currencySymbol: '$',
            taxRate: 5,
            gstNumber: '',
            tenantId,
            branchId,
        });
    }
    return settings;
};

// GET /api/settings
const getSettings = async (req, res) => {
    try {
        const settings = await getOrInitSettings(req.tenantId, req.branchId);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

// PUT /api/settings
const updateSettings = async (req, res) => {
    try {
        const { restaurantName, currency, currencySymbol, taxRate, gstNumber } = req.body;
        const settings = await getOrInitSettings(req.tenantId, req.branchId);

        if (restaurantName !== undefined) settings.restaurantName = restaurantName;
        if (currency !== undefined) settings.currency = currency;
        if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
        if (taxRate !== undefined) settings.taxRate = taxRate;
        if (gstNumber !== undefined) settings.gstNumber = gstNumber;

        await settings.save();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings' });
    }
};

// POST /api/settings/change-password
const changePassword = async (req, res) => {
    try {
        const { userId, role, newPassword } = req.body;

        let targetUser;

        // Requirement: If role is provided, find user by role + branchId
        // Only Admin can change passwords for other roles
        if (role) {
            if (req.role !== 'admin') {
                return res.status(403).json({ message: 'Only Admin can change staff passwords' });
            }

            targetUser = await User.findOne({
                role: role,
                branchId: req.branchId,
                tenantId: req.tenantId
            });
        } else {
            // Fallback: If no role, identify user by userId (default to current user)
            const idToUpdate = userId || req.userId;

            // Admin can only change passwords within their own tenant
            targetUser = await User.findOne({
                _id: idToUpdate,
                tenantId: req.tenantId,   // Scoped to same tenant
            });

            // Non-admin can only change their own password
            if (req.role !== 'admin' && req.userId.toString() !== idToUpdate.toString()) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update password (pre-save hook will handle hashing)
        targetUser.password = newPassword;
        await targetUser.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error updating password' });
    }
};

module.exports = { getSettings, updateSettings, changePassword };
