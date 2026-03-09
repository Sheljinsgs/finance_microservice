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

module.exports = router;
