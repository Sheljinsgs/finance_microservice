const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Income = require('../models/Income');
const multer = require('multer');
const path = require('path');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/proofs');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// @route   POST api/income
// @desc    Add new income
// @access  Private
router.post('/', [auth, upload.single('image')], async (req, res) => {
    const { amount, category, accountId, description, date, isRecurring, frequency } = req.body;
    const proofImageUrl = req.file ? `/uploads/proofs/${req.file.filename}` : '';

    let nextDueDate = null;
    if (isRecurring === 'true' || isRecurring === true) {
        const d = new Date(date);
        if (frequency === 'Daily') d.setDate(d.getDate() + 1);
        if (frequency === 'Weekly') d.setDate(d.getDate() + 7);
        if (frequency === 'Monthly') d.setMonth(d.getMonth() + 1);
        if (frequency === 'Yearly') d.setFullYear(d.getFullYear() + 1);
        nextDueDate = d;
    }

    try {
        const newIncome = new Income({
            userId: req.user.id,
            amount: parseFloat(amount),
            category,
            accountId,
            description,
            date,
            proofImageUrl,
            isRecurring: isRecurring === 'true' || isRecurring === true,
            frequency,
            nextDueDate
        });

        const income = await newIncome.save();

        // Update Account Balance
        const Account = require('../models/Account');
        await Account.findByIdAndUpdate(accountId, {
            $inc: { balance: parseFloat(amount), totalIncome: parseFloat(amount) }
        });

        res.json(income);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/income
// @desc    Get all income for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const incomes = await Income.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(incomes);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/income/:id
// @desc    Update income
// @access  Private
router.put('/:id', [auth, upload.single('image')], async (req, res) => {
    const { amount, category, accountId, description, date } = req.body;

    try {
        let income = await Income.findById(req.params.id);
        if (!income) return res.status(404).json({ msg: 'Income not found' });
        if (income.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        const Account = require('../models/Account');
        
        // 1. Reverse old balance
        await Account.findByIdAndUpdate(income.accountId, {
            $inc: { balance: -income.amount, totalIncome: -income.amount }
        });

        // 2. Update income record
        const updatedFields = {
            amount: parseFloat(amount),
            category,
            accountId,
            description,
            date
        };
        if (req.file) {
            updatedFields.proofImageUrl = `/uploads/proofs/${req.file.filename}`;
        }

        income = await Income.findByIdAndUpdate(
            req.params.id,
            { $set: updatedFields },
            { new: true }
        );

        // 3. Apply new balance
        await Account.findByIdAndUpdate(accountId, {
            $inc: { balance: parseFloat(amount), totalIncome: parseFloat(amount) }
        });

        res.json(income);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/income/:id
// @desc    Delete income
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let income = await Income.findById(req.params.id);

        if (!income) return res.status(404).json({ msg: 'Income not found' });

        // Ensure user owns income
        if (income.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Update Account Balance (Reverse)
        const Account = require('../models/Account');
        await Account.findByIdAndUpdate(income.accountId, {
            $inc: { balance: -income.amount, totalIncome: -income.amount }
        });

        await Income.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Income removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
