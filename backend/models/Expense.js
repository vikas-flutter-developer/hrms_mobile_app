const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    category: { type: String, enum: ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Other'], required: true },
    amount: { type: Number, required: true },
    dateIncurred: { type: Date, required: true },
    description: { type: String },
    receipt: {
        data: Buffer,
        contentType: String
    },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Reimbursed'], default: 'Pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' } // Manager or HR ID
}, { timestamps: true });

module.exports = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);