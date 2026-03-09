const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Expense = require('../models/Expense');
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

// @route   POST api/expense
// @desc    Add new expense
// @access  Private
router.post('/', [auth, upload.single('image')], async (req, res) => {
    const { amount, category, accountId, description, date, isRecurring, frequency, tags } = req.body;
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
        const newExpense = new Expense({
            userId: req.user.id,
            amount: parseFloat(amount),
            category,
            accountId,
            description,
            date,
            proofImageUrl,
            isRecurring: isRecurring === 'true' || isRecurring === true,
            frequency,
            nextDueDate,
            tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : []
        });

        const expense = await newExpense.save();

        // Update Account Balance
        const Account = require('../models/Account');
        await Account.findByIdAndUpdate(accountId, {
            $inc: { balance: -parseFloat(amount), totalExpense: parseFloat(amount) }
        });

        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/expense
// @desc    Get all expenses for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/expense/:id
// @desc    Update expense
// @access  Private
router.put('/:id', [auth, upload.single('image')], async (req, res) => {
    const { amount, category, accountId, description, date } = req.body;

    try {
        let expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ msg: 'Expense not found' });
        if (expense.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        const Account = require('../models/Account');
        
        // 1. Reverse old balance
        await Account.findByIdAndUpdate(expense.accountId, {
            $inc: { balance: expense.amount, totalExpense: -expense.amount }
        });

        // 2. Update expense record
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

        expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { $set: updatedFields },
            { new: true }
        );

        // 3. Apply new balance
        await Account.findByIdAndUpdate(accountId, {
            $inc: { balance: -parseFloat(amount), totalExpense: parseFloat(amount) }
        });

        res.json(expense);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/expense/:id
// @desc    Delete expense
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let expense = await Expense.findById(req.params.id);

        if (!expense) return res.status(404).json({ msg: 'Expense not found' });

        // Ensure user owns expense
        if (expense.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Update Account Balance (Reverse)
        const Account = require('../models/Account');
        await Account.findByIdAndUpdate(expense.accountId, {
            $inc: { balance: expense.amount, totalExpense: -expense.amount }
        });

        await Expense.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Expense removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
