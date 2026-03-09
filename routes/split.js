const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SplitExpense = require('../models/SplitExpense');
const Debt = require('../models/Debt');

// @route   POST api/split
// @desc    Create a split expense
// @access  Private
router.post('/', auth, async (req, res) => {
    const { description, totalAmount, splits, splitType, date } = req.body;

    try {
        const newSplit = new SplitExpense({
            userId: req.user.id,
            description,
            totalAmount,
            splits,
            splitType: splitType || 'equal',
            date: date || new Date()
        });

        const splitExpense = await newSplit.save();

        // Auto-create debt entries for each person's share
        for (const split of splits) {
            if (!split.isPaid) {
                const debt = new Debt({
                    userId: req.user.id,
                    personName: split.personName,
                    amount: split.amount,
                    type: 'given', // You paid, they owe you
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
                    status: 'unpaid'
                });
                await debt.save();
            }
        }

        res.json(splitExpense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/split
// @desc    Get all split expenses
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const splits = await SplitExpense.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(splits);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/split/:id/settle/:personName
// @desc    Mark a person's split as paid
// @access  Private
router.put('/:id/settle/:personIndex', auth, async (req, res) => {
    try {
        const split = await SplitExpense.findById(req.params.id);
        if (!split) return res.status(404).json({ msg: 'Split not found' });
        if (split.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        const index = parseInt(req.params.personIndex);
        if (index >= 0 && index < split.splits.length) {
            split.splits[index].isPaid = true;
            await split.save();
        }

        res.json(split);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/split/:id
// @desc    Delete a split expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const split = await SplitExpense.findById(req.params.id);
        if (!split) return res.status(404).json({ msg: 'Split not found' });
        if (split.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        await SplitExpense.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Split expense removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
