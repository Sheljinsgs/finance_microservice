const mongoose = require('mongoose');

const DebtSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    personName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String, // given, taken
        required: true,
        enum: ['given', 'taken']
    },
    dueDate: {
        type: Date
    },
    status: {
        type: String, // paid, unpaid
        default: 'unpaid',
        enum: ['paid', 'unpaid']
    }
});

module.exports = mongoose.model('Debt', DebtSchema);
