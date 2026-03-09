const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Transfer = require('../models/Transfer');

// @route   GET api/transactions
// @desc    Get all user transactions (unified)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const incomes = await Income.find({ userId: req.user.id });
        const expenses = await Expense.find({ userId: req.user.id });
        const transfers = await Transfer.find({ userId: req.user.id });

        const formattedIncomes = incomes.map(item => ({
            ...item._doc,
            type: 'Income'
        }));

        const formattedExpenses = expenses.map(item => ({
            ...item._doc,
            type: 'Expense'
        }));

        const formattedTransfers = transfers.map(item => ({
            ...item._doc,
            type: 'Transfer'
        }));

        const allTransactions = [
            ...formattedIncomes,
            ...formattedExpenses,
            ...formattedTransfers
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(allTransactions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
