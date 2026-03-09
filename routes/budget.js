const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
const User = require('../models/User');

// @route   GET api/budget/summary
// @desc    Get budget summary (expenses vs limits per category for current month)
// @access  Private
router.get('/summary', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('settings');
        const budgets = user?.settings?.budgets || [];

        if (budgets.length === 0) {
            return res.json({ budgets: [], month: new Date().getMonth() + 1, year: new Date().getFullYear() });
        }

        // Get current month's expenses
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const expenses = await Expense.find({
            userId: req.user.id,
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Aggregate expenses by category
        const categorySpending = {};
        expenses.forEach(exp => {
            const cat = exp.category;
            categorySpending[cat] = (categorySpending[cat] || 0) + exp.amount;
        });

        // Build budget summary
        const budgetSummary = budgets.map(b => ({
            category: b.category,
            limit: b.limit,
            spent: categorySpending[b.category] || 0,
            remaining: b.limit - (categorySpending[b.category] || 0),
            percentage: b.limit > 0 ? Math.min(((categorySpending[b.category] || 0) / b.limit) * 100, 100) : 0,
            isOverBudget: (categorySpending[b.category] || 0) > b.limit
        }));

        // Also include categories with spending but no budget
        const unbucketedCategories = [];
        Object.keys(categorySpending).forEach(cat => {
            if (!budgets.find(b => b.category === cat)) {
                unbucketedCategories.push({
                    category: cat,
                    limit: 0,
                    spent: categorySpending[cat],
                    remaining: 0,
                    percentage: 100,
                    isOverBudget: false,
                    noBudgetSet: true
                });
            }
        });

        res.json({
            budgets: budgetSummary,
            unbucketed: unbucketedCategories,
            totalBudget: budgets.reduce((sum, b) => sum + b.limit, 0),
            totalSpent: Object.values(categorySpending).reduce((sum, v) => sum + v, 0),
            month: now.getMonth() + 1,
            year: now.getFullYear()
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/budget/history
// @desc    Get monthly budget history
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('settings');
        const budgets = user?.settings?.budgets || [];
        const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);

        // Get last 6 months data
        const history = [];
        const now = new Date();

        for (let i = 0; i < 6; i++) {
            const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            
            const expenses = await Expense.find({
                userId: req.user.id,
                date: { $gte: month, $lte: endOfMonth }
            });

            const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
            
            history.push({
                month: month.getMonth() + 1,
                year: month.getFullYear(),
                totalBudget,
                totalSpent,
                label: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            });
        }

        res.json(history.reverse());
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
