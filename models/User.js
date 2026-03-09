const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    sessions: [{
        token: {
            type: String,
            required: true
        },
        lastActive: {
            type: Date,
            default: Date.now
        },
        deviceInfo: {
            type: String
        }
    }],
    settings: {
        dailyReminder: {
            type: Boolean,
            default: false
        },
        reminderTime: {
            type: String,
            default: "20:00"
        },
        expenseAlertLimit: {
            type: Number,
            default: 0
        },
        isBiometricEnabled: {
            type: Boolean,
            default: false
        },
        budgets: [{
            category: String,
            limit: Number
        }]
    }
});

module.exports = mongoose.model('User', UserSchema);
