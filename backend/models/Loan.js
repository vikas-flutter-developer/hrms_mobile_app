const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    emiAmount: { type: Number, required: true },
    balanceRemaining: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Closed'], default: 'Pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    disbursementDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
