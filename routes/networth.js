const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Account = require('../models/Account');
const Debt = require('../models/Debt');
const NetWorthSnapshot = require('../models/NetWorthSnapshot');

// @route   GET api/networth
// @desc    Get current net worth
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const accounts = await Account.find({ userId: req.user.id });
        const debts = await Debt.find({ userId: req.user.id, status: 'unpaid' });

        const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
        
        let totalDebtsGiven = 0; // Money others owe you (asset)
        let totalDebtsTaken = 0; // Money you owe others (liability)
        
        debts.forEach(d => {
            if (d.type === 'given') totalDebtsGiven += d.amount;
            else if (d.type === 'taken') totalDebtsTaken += d.amount;
        });

        const netWorth = totalAssets + totalDebtsGiven - totalDebtsTaken;

        const accountBreakdown = accounts.map(a => ({
            accountName: a.name,
            accountType: a.type,
            balance: a.balance
        }));

        res.json({
            totalAssets,
            totalDebtsGiven,
            totalDebtsTaken,
            netWorth,
            accountBreakdown,
            debtsBreakdown: {
                given: totalDebtsGiven,
                taken: totalDebtsTaken,
                net: totalDebtsGiven - totalDebtsTaken
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/networth/snapshot
// @desc    Save current month's net worth snapshot
// @access  Private
router.post('/snapshot', auth, async (req, res) => {
    try {
        const accounts = await Account.find({ userId: req.user.id });
        const debts = await Debt.find({ userId: req.user.id, status: 'unpaid' });

        const totalAssets = accounts.reduce((sum, a) => sum + a.balance, 0);
        let totalDebtsTaken = 0;
        let totalDebtsGiven = 0;
        
        debts.forEach(d => {
            if (d.type === 'given') totalDebtsGiven += d.amount;
            else if (d.type === 'taken') totalDebtsTaken += d.amount;
        });

        const netWorth = totalAssets + totalDebtsGiven - totalDebtsTaken;
        const now = new Date();

        const accountBreakdown = accounts.map(a => ({
            accountName: a.name,
            accountType: a.type,
            balance: a.balance
        }));

        // Upsert snapshot for current month
        const snapshot = await NetWorthSnapshot.findOneAndUpdate(
            { userId: req.user.id, month: now.getMonth() + 1, year: now.getFullYear() },
            {
                totalAssets,
                totalDebts: totalDebtsTaken,
                netWorth,
                accountBreakdown,
                snapshotDate: now
            },
            { upsert: true, new: true }
        );

        res.json(snapshot);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/networth/history
// @desc    Get net worth history (last 12 months)
// @access  Private
router.get('/history', auth, async (req, res) => {
    try {
        const snapshots = await NetWorthSnapshot.find({ userId: req.user.id })
            .sort({ year: 1, month: 1 })
            .limit(12);

        res.json(snapshots);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
