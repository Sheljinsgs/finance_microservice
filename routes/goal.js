const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Goal = require('../models/Goal');

// @route   POST api/goals
// @desc    Create new goal
// @access  Private
router.post('/', auth, async (req, res) => {
    const { title, targetAmount, currentAmount, deadline, icon, color } = req.body;

    try {
        const newGoal = new Goal({
            userId: req.user.id,
            title,
            targetAmount,
            currentAmount,
            deadline,
            icon,
            color
        });

        const goal = await newGoal.save();
        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/goals
// @desc    Get all goals
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user.id });
        res.json(goals);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/goals/update-progress/:id
// @desc    Update goal progress
// @access  Private
router.put('/update-progress/:id', auth, async (req, res) => {
    const { currentAmount } = req.body;

    try {
        let goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ msg: 'Goal not found' });

        if (goal.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        goal = await Goal.findByIdAndUpdate(
            req.params.id,
            { $set: { currentAmount } },
            { new: true }
        );

        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// @route   PUT api/goals/:id
// @desc    Update goal
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { title, targetAmount, deadline, color, icon } = req.body;

    try {
        let goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ msg: 'Goal not found' });

        if (goal.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        goal = await Goal.findByIdAndUpdate(
            req.params.id,
            { $set: { title, targetAmount, deadline, color, icon } },
            { new: true }
        );

        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/goals/contribute/:id
// @desc    Add contribution to goal
// @access  Private
router.post('/contribute/:id', auth, async (req, res) => {
    const { amount, accountId } = req.body;

    try {
        let goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ msg: 'Goal not found' });

        if (goal.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        let accountName = 'Unknown';
        if (accountId) {
            const Account = require('../models/Account');
            const account = await Account.findById(accountId);
            if (account) {
                accountName = account.name;
                account.balance -= parseFloat(amount);
                await account.save();
            }
        }

        const contribution = {
            amount: parseFloat(amount),
            date: new Date(),
            accountId: accountId || null,
            accountName
        };

        if (!goal.contributions) goal.contributions = [];
        goal.contributions.push(contribution);
        goal.currentAmount += parseFloat(amount);

        await goal.save();

        res.json(goal);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/goals/:id
// @desc    Delete goal
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const goal = await Goal.findById(req.params.id);

        if (!goal) return res.status(404).json({ msg: 'Goal not found' });

        if (goal.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Goal.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Goal removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
