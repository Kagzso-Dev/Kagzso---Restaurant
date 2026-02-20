const express = require('express');
const router = express.Router();
const {
    getAllTenants,
    createTenant,
    updateTenant,
    deleteTenant,
    getBranches,
    createBranch,
    updateBranch,
    seedBranchAdmin,
    getStats,
} = require('../controllers/superAdminController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

// All superadmin routes require valid JWT + superadmin role
router.use(protect, superAdminOnly);

router.get('/stats', getStats);

router.route('/tenants')
    .get(getAllTenants)
    .post(createTenant);

router.route('/tenants/:id')
    .put(updateTenant)
    .delete(deleteTenant);

router.route('/tenants/:tenantId/branches')
    .get(getBranches)
    .post(createBranch);

router.route('/branches/:id')
    .put(updateBranch);

router.post('/tenants/:tenantId/branches/:branchId/seed-admin', seedBranchAdmin);

module.exports = router;
