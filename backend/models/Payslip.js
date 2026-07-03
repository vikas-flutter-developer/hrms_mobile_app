const mongoose = require('mongoose');

const PayslipSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: String, required: true }, // e.g., "May 2026"

    // Earnings
    basicPay: { type: Number, required: true },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    gratuity: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },

    // Deductions
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    lopDeduction: { type: Number, default: 0 }, // Loss of pay deduction
    loanEmi: { type: Number, default: 0 }, // EMI deduction for active loans

    netPay: { type: Number, required: true },
    status: { type: String, enum: ['Draft', 'Processed', 'Paid'], default: 'Draft' },
    paymentDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.Payslip || mongoose.model('Payslip', PayslipSchema);