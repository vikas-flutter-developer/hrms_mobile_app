const mongoose = require('mongoose');

const ShiftSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    name: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    totalHours: { type: Number, default: 8 },
    rotationCycle: { type: String, default: 'Weekly' },
    gracePeriodMinutes: { type: Number, default: 10 },
    nightShiftAllowancePercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }]
}, { timestamps: true });

ShiftSchema.index({ company: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Shift || mongoose.model('Shift', ShiftSchema);
