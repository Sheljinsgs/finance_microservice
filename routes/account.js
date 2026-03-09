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

module.exports = router;
