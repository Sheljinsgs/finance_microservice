const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Account = require('../models/Account');

// @route   GET api/accounts
// @desc    Get all user accounts
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const accounts = await Account.find({ userId: req.user.id });
        res.json(accounts);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/accounts
// @desc    Add new account
// @access  Private
router.post('/', auth, async (req, res) => {
    const { name, type, category, balance, currency } = req.body;

    try {
        const newAccount = new Account({
            userId: req.user.id,
            name,
            type,
            category,
            balance,
            currency
        });

        const account = await newAccount.save();
        res.json(account);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/accounts/:id
// @desc    Update account
// @access  Private
router.put('/:id', auth, async (req, res) => {
    const { name, type, category, balance, currency } = req.body;

    try {
        let account = await Account.findById(req.params.id);

        if (!account) return res.status(404).json({ msg: 'Account not found' });

        // Make sure user owns account
        if (account.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        account = await Account.findByIdAndUpdate(
            req.params.id,
            { $set: { name, type, category, balance, currency } },
            { new: true }
        );

        res.json(account);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/accounts/:id
// @desc    Delete account
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        let account = await Account.findById(req.params.id);

        if (!account) return res.status(404).json({ msg: 'Account not found' });

        // Make sure user owns account
        if (account.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        await Account.findByIdAndDelete(req.params.id);

        res.json({ msg: 'Account removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
