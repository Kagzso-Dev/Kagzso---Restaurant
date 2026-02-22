const jwt = require('jsonwebtoken');

/**
 * protect - Verifies JWT and attaches decoded payload to req.
 * Stores: req.userId, req.tenantId, req.branchId, req.role, req.user
 */
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Attach all tenant/branch context from JWT payload
            req.userId = decoded.userId;
            req.tenantId = decoded.tenantId;
            req.branchId = decoded.branchId;
            req.role = decoded.role;

            // SUPERADMIN OVERRIDE: Allow switching tenant context via header
            if (decoded.role === 'superadmin' && req.headers['x-tenant-id']) {
                req.tenantId = req.headers['x-tenant-id'];
            }

            // Convenience alias
            req.user = {
                _id: decoded.userId,
                tenantId: req.tenantId, // Use the potentially overridden tenantId
                branchId: decoded.branchId,
                role: decoded.role,
            };

            next();
        } catch (error) {
            console.error('JWT verification failed:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

/**
 * authorize - Role-based access control.
 * Usage: authorize('admin', 'cashier')
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized' });
        }
        if (!roles.includes(req.role)) {
            return res.status(403).json({
                message: `Role '${req.role}' is not authorized to access this route`
            });
        }
        next();
    };
};

/**
 * superAdminOnly - Only superadmin can access.
 * SuperAdmin has no tenantId/branchId restriction.
 */
const superAdminOnly = (req, res, next) => {
    if (req.role !== 'superadmin') {
        return res.status(403).json({ message: 'SuperAdmin access only' });
    }
    next();
};

/**
 * requireTenant - Ensures tenantId is present (blocks superadmin-only tokens from tenant routes).
 */
const requireTenant = (req, res, next) => {
    // SuperAdmin bypasses tenant requirement (they act as global root)
    if (req.role === 'superadmin') {
        return next();
    }

    if (!req.tenantId) {
        return res.status(403).json({ message: 'Tenant context required' });
    }
    next();
};

module.exports = { protect, authorize, superAdminOnly, requireTenant };
