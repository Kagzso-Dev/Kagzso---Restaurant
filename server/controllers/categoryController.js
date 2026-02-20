const Category = require('../models/Category');

// @desc    Get all categories for this branch
// @route   GET /api/categories
// @access  Private
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({
            status: 'active',
            tenantId: req.tenantId,
            branchId: req.branchId,
        });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private (Admin)
const createCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        const category = await Category.create({
            name,
            description,
            tenantId: req.tenantId,
            branchId: req.branchId,
        });
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getCategories, createCategory };
