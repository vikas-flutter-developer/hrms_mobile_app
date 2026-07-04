const mongoose = require('mongoose');

const AssetDamageSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['Reported', 'In Repair', 'Resolved', 'Replaced'], default: 'Reported' },
    repairCost: { type: Number, default: 0 },
    paymentMode: { 
        type: String, 
        enum: ['Salary Deduction', 'Lump Sum Payment', 'Company Covered'], 
        default: 'Company Covered' 
    },
    isDeductedFromSalary: { type: Boolean, default: false },
    deductionMonth: { type: String },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.model('AssetDamage', AssetDamageSchema);
