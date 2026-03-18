const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Debt = require('../models/Debt');

// @route   POST api/debt
// @desc    Add new debt entry
// @access  Private
router.post('/', auth, async (req, res) => {
    const { personName, amount, type, dueDate, status } = req.body;

    try {
        const newDebt = new Debt({
            userId: req.user.id,
            personName,
            amount,
            type,
            dueDate,
            status
        });

        const debt = await newDebt.save();
        res.json(debt);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/debt
// @desc    Get all debt records
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const debts = await Debt.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(debts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/debt/update-status/:id
// @desc    Update debt status
// @access  Private
router.put('/update-status/:id', auth, async (req, res) => {
    const { status } = req.body;

    try {
        let debt = await Debt.findById(req.params.id);

        if (!debt) return res.status(404).json({ msg: 'Debt record not found' });

        if (debt.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        debt = await Debt.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        );

        res.json(debt);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/debt/repay/:id
// @desc    Repay a debt
// @access  Private
router.put('/repay/:id', auth, async (req, res) => {
    const { status, accountId } = req.body;

    try {
        let debt = await Debt.findById(req.params.id);

        if (!debt) return res.status(404).json({ msg: 'Debt record not found' });

        if (debt.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Handle balance update if accountId is provided
        if (accountId && status === 'paid' && debt.status !== 'paid') {
            const Account = require('../models/Account');
            const account = await Account.findById(accountId);
            if (account) {
                // If I am 'given' (lent) money, and it's repaid, my balance increases
                // If I am 'taken' (borrowed) money, and I repay it, my balance decreases
                if (debt.type === 'given') {
                    account.balance += debt.amount;
                } else {
                    account.balance -= debt.amount;
                }
                await account.save();
            }
        }

        debt.status = status;
        await debt.save();

        res.json(debt);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
