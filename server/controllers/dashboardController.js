const Order = require('../models/Order');

/**
 * @desc    Calculate revenue growth (today vs yesterday, or this week vs last week)
 * @route   GET /api/dashboard/growth
 * @access  Private (admin only)
 *
 * Uses MongoDB aggregation pipeline with the indexed fields:
 *   { tenantId, branchId, paymentStatus, createdAt }
 *
 * Returns:
 *   { growth: number, today: number, yesterday: number, period: 'daily' | 'weekly' }
 */
const getGrowth = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const branchId = req.branchId;

        // ── Date boundaries ───────────────────────────────────────────────────
        const now = new Date();

        // Today: midnight → now (local-day aligned via UTC offset)
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // Yesterday: full day
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        const yesterdayEnd = new Date(todayStart);
        yesterdayEnd.setMilliseconds(-1); // one ms before today started

        // ── Aggregation: sum finalAmount for paid orders in each window ────────
        const [todayResult, yesterdayResult] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        tenantId,
                        branchId,
                        paymentStatus: 'paid',
                        createdAt: { $gte: todayStart, $lte: todayEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$finalAmount' },
                        count: { $sum: 1 },
                    },
                },
            ]),
            Order.aggregate([
                {
                    $match: {
                        tenantId,
                        branchId,
                        paymentStatus: 'paid',
                        createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
                    },
                },
                {
                    $group: {
                        _id: null,
                        revenue: { $sum: '$finalAmount' },
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const todayRevenue = todayResult[0]?.revenue || 0;
        const yesterdayRevenue = yesterdayResult[0]?.revenue || 0;
        const todayCount = todayResult[0]?.count || 0;
        const yesterdayCount = yesterdayResult[0]?.count || 0;

        // ── Growth calculation — safe divide-by-zero handling ─────────────────
        let growth = 0;
        if (yesterdayRevenue === 0 && todayRevenue > 0) {
            growth = 100; // First day with revenue = 100% growth
        } else if (yesterdayRevenue === 0 && todayRevenue === 0) {
            growth = 0;   // Both zero — no change
        } else {
            growth = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
        }

        // Round to 1 decimal place
        growth = Math.round(growth * 10) / 10;

        res.json({
            growth,
            today: todayRevenue,
            yesterday: yesterdayRevenue,
            todayCount,
            yesterdayCount,
            period: 'daily',
        });
    } catch (error) {
        console.error('[dashboardController] getGrowth error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get high-level summary stats for admin dashboard header
 * @route   GET /api/dashboard/stats
 * @access  Private (admin only)
 */
const getStats = async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const branchId = req.branchId;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [todayStats, allTimeCount] = await Promise.all([
            Order.aggregate([
                {
                    $match: {
                        tenantId,
                        branchId,
                        createdAt: { $gte: today },
                    },
                },
                {
                    $group: {
                        _id: '$orderStatus',
                        count: { $sum: 1 },
                        revenue: { $sum: '$finalAmount' },
                    },
                },
            ]),
            Order.countDocuments({ tenantId, branchId }),
        ]);

        // Reshape aggregation result
        const byStatus = {};
        todayStats.forEach(s => { byStatus[s._id] = { count: s.count, revenue: s.revenue }; });

        res.json({
            today: {
                active: (byStatus.pending?.count || 0) + (byStatus.accepted?.count || 0) + (byStatus.preparing?.count || 0) + (byStatus.ready?.count || 0),
                completed: byStatus.completed?.count || 0,
                cancelled: byStatus.cancelled?.count || 0,
                revenue: byStatus.completed?.revenue || 0,
            },
            allTime: allTimeCount,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getGrowth, getStats };
