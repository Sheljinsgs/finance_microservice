const mongoose = require('mongoose');

const SplitExpenseSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expenseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Expense'
    },
    description: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    splits: [{
        personName: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        isPaid: {
            type: Boolean,
            default: false
        }
    }],
    splitType: {
        type: String,
        enum: ['equal', 'custom'],
        default: 'equal'
    }
});

module.exports = mongoose.model('SplitExpense', SplitExpenseSchema);
