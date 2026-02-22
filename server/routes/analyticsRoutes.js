const express = require('express');
const router = express.Router();
const {
    getSummary,
    getHeatmap,
    getWaitersRanking,
    getKitchenPerformance,
    getBranchComparison,
    getReport
} = require('../controllers/analyticsController');
const { protect, authorize, requireTenant } = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../utils/cache');

// All analytics routes require authentication and tenant context
// Restricted to admin only for security
router.use(protect, requireTenant, authorize('admin'));

// Cache TTLs tuned per query complexity:
//   summary/heatmap = expensive aggregation → 60s
//   kitchen/waiters = moderate → 30s
//   branches       = cross-branch → 120s
//   report         = variable range → 45s
router.get('/summary', cacheMiddleware(60, 'analytics'), getSummary);
router.get('/heatmap', cacheMiddleware(60, 'analytics'), getHeatmap);
router.get('/waiters', cacheMiddleware(30, 'analytics'), getWaitersRanking);
router.get('/kitchen', cacheMiddleware(30, 'analytics'), getKitchenPerformance);
router.get('/branches', cacheMiddleware(120, 'analytics'), getBranchComparison);
router.get('/report', cacheMiddleware(45, 'analytics'), getReport);

module.exports = router;
