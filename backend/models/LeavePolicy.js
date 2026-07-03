const mongoose = require('mongoose');

const LeavePolicySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    type: { type: String, required: true, trim: true }, // e.g., 'Sick Leave', 'Casual Leave'
    annualQuota: { type: String, required: true }, // e.g., '12' or 'Dynamic'
    accrual: { type: String, default: 'Yearly upfront' },
    carryForward: { type: String, default: 'No' },
    encashment: { type: String, default: 'No' },
    gender: { type: String, enum: ['All', 'Male', 'Female', 'Other'], default: 'All' },
    isActive: { type: Boolean, default: true },
    carryForwardLimit: { type: Number, default: 0 },
    encashmentAllowed: { type: Boolean, default: false },
    accrualType: { type: String, enum: ['Monthly', 'Yearly', 'None'], default: 'None' }
}, { timestamps: true });

module.exports = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', LeavePolicySchema);