const mongoose = require('mongoose');

const PettyCashSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    amount: { type: Number, required: true },
    dateIssued: { type: Date, required: true },
    purpose: { type: String, required: true },
    status: { type: String, enum: ['Issued', 'Settled'], default: 'Issued' },
    settledDate: { type: Date },
    balanceReturned: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.PettyCash || mongoose.model('PettyCash', PettyCashSchema);
