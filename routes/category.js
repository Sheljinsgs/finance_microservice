const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Category = require('../models/Category');

// @route   POST api/category
// @desc    Create new category
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, type } = req.body;

    try {
        const newCategory = new Category({
            userId: req.user.id,
            name,
            type
        });

        const category = await newCategory.save();
        res.json(category);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/category
// @desc    Get all categories for user (optionally filter by type)
// @access  Private
router.get('/', auth, async (req, res) => {
    const { type } = req.query;
    let query = { userId: req.user.id };

    if (type) {
        query.type = type;
    }

    try {
        const categories = await Category.find(query);
        res.json(categories);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
