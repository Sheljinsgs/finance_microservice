const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
    const { name, email, mobile, password } = req.body;

    try {
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            name,
            email,
            mobile,
            password
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password, force } = req.body;

    try {
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id
            }
        };

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not defined in environment variables');
            return res.status(500).json({ msg: 'Server configuration error: JWT_SECRET missing' });
        }

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            async (err, token) => {
                if (err) {
                    console.error('JWT Sign Error:', err);
                    return res.status(500).json({ msg: 'Error generating token' });
                }
                
                if (!user.sessions) user.sessions = [];
                const maxSessions = parseInt(process.env.MAX_SESSIONS) || 2;
                
                if (user.sessions.length >= maxSessions) {
                    if (force) {
                        user.sessions.sort((a, b) => new Date(a.lastActive) - new Date(b.lastActive));
                        user.sessions.shift();
                    } else {
                        return res.status(409).json({ msg: `Max ${maxSessions} devices reached.` });
                    }
                }

                user.sessions.push({
                    token,
                    lastActive: new Date(),
                    deviceInfo: req.header('User-Agent') || 'Mobile App'
                });

                await user.save();
                res.json({ token });
            }
        );
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ 
            msg: 'Server error', 
            error: err.message,
            stack: process.env.NODE_ENV === 'production' ? null : err.stack 
        });
    }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/logout
// @desc    Logout user (remove session)
// @access  Private
router.post('/logout', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const token = req.header('x-auth-token');

        if (user) {
            user.sessions = user.sessions.filter(s => s.token !== token);
            await user.save();
        }
        
        res.json({ msg: 'Logged out successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/update
// @desc    Update user details
// @access  Private
router.put('/update', auth, async (req, res) => {
    const { name, mobile } = req.body;

    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (name) user.name = name;
        if (mobile) user.mobile = mobile;

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   PUT api/auth/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', auth, async (req, res) => {
    const { dailyReminder, reminderTime, expenseAlertLimit, isBiometricEnabled, budgets } = req.body;

    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (!user.settings) {
            user.settings = {};
        }

        // We use check for undefined because dailyReminder is boolean (false is valid)
        if (dailyReminder !== undefined) user.settings.dailyReminder = dailyReminder;
        if (reminderTime) user.settings.reminderTime = reminderTime;
        if (expenseAlertLimit !== undefined) user.settings.expenseAlertLimit = expenseAlertLimit;
        if (isBiometricEnabled !== undefined) user.settings.isBiometricEnabled = isBiometricEnabled;
        if (budgets) user.settings.budgets = budgets;

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/refresh
// @desc    Refresh user token (Sliding Session)
// @access  Private
router.get('/refresh', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            async (err, token) => {
                if (err) throw err;

                // Update the session in the DB with the new token
                // We need to find the old session (matching current token) and update it, 
                // OR just add a new one and remove the old one (rotation).
                // Since we don't easily have the old token string in the 'refresh' body (it's in header),
                // we can look it up.
                const oldToken = req.header('x-auth-token');
                
                // Find and update the specific session
                const sessionIndex = user.sessions.findIndex(s => s.token === oldToken);
                if (sessionIndex !== -1) {
                     user.sessions[sessionIndex].token = token;
                     user.sessions[sessionIndex].lastActive = new Date();
                } else {
                    // Fallback: just add new
                     user.sessions.push({
                        token,
                        lastActive: new Date(),
                        deviceInfo: req.header('User-Agent') || 'Mobile App'
                    });
                }
                
                await user.save();
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
