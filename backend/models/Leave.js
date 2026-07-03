const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeRole: { type: String, required: true, enum: ['employee', 'hr'], lowercase: true, trim: true },
  type: {
    type: String, required: true,
    enum: ['Sick Leave', 'Casual Leave', 'Earned Leave', 'Maternity Leave', 'Paternity Leave', 'Comp-off', 'LOP', 'Resignation']
  },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  endDate: { type: String, required: true },
  days: { type: Number, required: true },
  reason: { type: String },
  isLossOfPay: { type: Boolean, default: false }, // Useful for payroll calculation
  isLOP: { type: Boolean, default: false }, // Set when leave approved with zero balance
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  actionedByName: { type: String },
  actionedByIdString: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);