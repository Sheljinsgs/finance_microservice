const mongoose = require('mongoose');

const NetWorthSnapshotSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    totalAssets: {
        type: Number,
        default: 0
    },
    totalDebts: {
        type: Number,
        default: 0
    },
    netWorth: {
        type: Number,
        default: 0
    },
    accountBreakdown: [{
        accountName: String,
        accountType: String,
        balance: Number
    }],
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    snapshotDate: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate snapshots for same month
NetWorthSnapshotSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('NetWorthSnapshot', NetWorthSnapshotSchema);
