const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Income = require('../models/Income');
const Expense = require('../models/Expense');
const Transfer = require('../models/Transfer');
const Account = require('../models/Account');
const Goal = require('../models/Goal');
const Debt = require('../models/Debt');

// @route   GET api/export/csv
// @desc    Export all user data as CSV
// @access  Private
router.get('/csv', auth, async (req, res) => {
    try {
        const incomes = await Income.find({ userId: req.user.id }).sort({ date: -1 });
        const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 });
        const transfers = await Transfer.find({ userId: req.user.id }).sort({ date: -1 });

        // Build CSV
        let csv = 'Type,Date,Amount,Category,Description,Account ID,Recurring,Frequency,Tags\n';

        incomes.forEach(item => {
            csv += `Income,${item.date ? new Date(item.date).toISOString().split('T')[0] : ''},${item.amount},${item.category || ''},"${(item.description || '').replace(/"/g, '""')}",${item.accountId || ''},${item.isRecurring || false},${item.frequency || ''},"${(item.tags || []).join('; ')}"\n`;
        });

        expenses.forEach(item => {
            csv += `Expense,${item.date ? new Date(item.date).toISOString().split('T')[0] : ''},${item.amount},${item.category || ''},"${(item.description || '').replace(/"/g, '""')}",${item.accountId || ''},${item.isRecurring || false},${item.frequency || ''},"${(item.tags || []).join('; ')}"\n`;
        });

        transfers.forEach(item => {
            csv += `Transfer,${item.date ? new Date(item.date).toISOString().split('T')[0] : ''},${item.amount},,"${(item.description || '').replace(/"/g, '""')}",${item.fromAccount || ''} -> ${item.toAccount || ''},false,,\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions_export.csv"');
        res.send(csv);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/export/json
// @desc    Export all user data as JSON (full backup)
// @access  Private
router.get('/json', auth, async (req, res) => {
    try {
        const [incomes, expenses, transfers, accounts, goals, debts] = await Promise.all([
            Income.find({ userId: req.user.id }),
            Expense.find({ userId: req.user.id }),
            Transfer.find({ userId: req.user.id }),
            Account.find({ userId: req.user.id }),
            Goal.find({ userId: req.user.id }),
            Debt.find({ userId: req.user.id }),
        ]);

        const backup = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            data: {
                incomes,
                expenses,
                transfers,
                accounts,
                goals,
                debts,
            }
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="sgs_finance_backup.json"');
        res.json(backup);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
