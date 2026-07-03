const mongoose = require('mongoose');

const PerformanceCycleSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    frequency: { type: String, enum: ['Quarterly', 'Half-Yearly', 'Yearly', 'Monthly'], default: 'Quarterly' },
    status: { type: String, enum: ['Planned', 'Active', 'Closed'], default: 'Planned' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.PerformanceCycle || mongoose.model('PerformanceCycle', PerformanceCycleSchema);
