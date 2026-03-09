const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    description: {
        type: String
    },
    date: {
        type: Date,
        required: true
    },
    proofImageUrl: {
        type: String
    },
    isRecurring: {
        type: Boolean,
        default: false
    },
    frequency: {
        type: String, // 'Daily', 'Weekly', 'Monthly', 'Yearly'
        default: null
    },
    nextDueDate: {
        type: Date,
        default: null
    },
    tags: [{
        type: String
    }]
});

module.exports = mongoose.model('Expense', ExpenseSchema);
