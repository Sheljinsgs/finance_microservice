const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    targetAmount: {
        type: Number,
        required: true
    },
    currentAmount: {
        type: Number,
        default: 0
    },
    deadline: {
        type: Date
    },
    icon: {
        type: String,
        default: 'flag'
    },
    color: {
        type: String,
        default: 'blue'
    },
    contributions: [
        {
            amount: { type: Number, required: true },
            date: { type: Date, default: Date.now },
            accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
            accountName: { type: String }
        }
    ]
});

module.exports = mongoose.model('Goal', GoalSchema);
