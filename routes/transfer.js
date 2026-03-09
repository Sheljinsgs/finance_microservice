const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Transfer = require('../models/Transfer');

// @route   POST api/transfer
// @desc    Add new transfer
// @access  Private
router.post('/', auth, async (req, res) => {
    const { fromAccount, toAccount, amount, date, description, proofImageUrl } = req.body;

    try {
        const floatAmount = parseFloat(amount);
        const newTransfer = new Transfer({
            userId: req.user.id,
            fromAccount,
            toAccount,
            amount: floatAmount,
            date,
            description,
            proofImageUrl
        });

        const transfer = await newTransfer.save();

        // Update Account Balances
        const Account = require('../models/Account');
        
        // Deduct from source
        await Account.findByIdAndUpdate(fromAccount, {
            $inc: { balance: -floatAmount }
        });

        // Add to destination
        await Account.findByIdAndUpdate(toAccount, {
            $inc: { balance: floatAmount }
        });

        res.json(transfer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/transfer
// @desc    Get all transfers for user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const transfers = await Transfer.find({ userId: req.user.id }).sort({ date: -1 });
        res.json(transfers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/transfer/:id
// @desc    Update transfer
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { fromAccount, toAccount, amount, date, description, proofImageUrl } = req.body;

    try {
        let transfer = await Transfer.findById(req.params.id);
        if (!transfer) return res.status(404).json({ msg: 'Transfer not found' });
        if (transfer.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        const Account = require('../models/Account');
        
        // 1. Reverse old balances
        await Account.findByIdAndUpdate(transfer.fromAccount, {
            $inc: { balance: transfer.amount }
        });
        await Account.findByIdAndUpdate(transfer.toAccount, {
            $inc: { balance: -transfer.amount }
        });

        // 2. Update transfer record
        const floatAmount = parseFloat(amount);
        transfer = await Transfer.findByIdAndUpdate(
            req.params.id,
            { 
                $set: { 
                    fromAccount, 
                    toAccount, 
                    amount: floatAmount, 
                    date, 
                    description, 
                    proofImageUrl 
                } 
            },
            { new: true }
        );

        // 3. Apply new balances
        await Account.findByIdAndUpdate(fromAccount, {
            $inc: { balance: -floatAmount }
        });
        await Account.findByIdAndUpdate(toAccount, {
            $inc: { balance: floatAmount }
        });

        res.json(transfer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/transfer/:id
// @desc    Delete transfer
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let transfer = await Transfer.findById(req.params.id);

        if (!transfer) return res.status(404).json({ msg: 'Transfer not found' });

        // Ensure user owns transfer
        if (transfer.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Update Account Balances (Reverse)
        const Account = require('../models/Account');
        
        // Add back to source
        await Account.findByIdAndUpdate(transfer.fromAccount, {
            $inc: { balance: transfer.amount }
        });

        // Deduct from destination
        await Account.findByIdAndUpdate(transfer.toAccount, {
            $inc: { balance: -transfer.amount }
        });

        await Transfer.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Transfer removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
