const mongoose = require('mongoose');

const PIPSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    goals: [{ description: String, targetDate: Date, measure: String }],
    status: { type: String, enum: ['Open', 'In Progress', 'Closed'], default: 'Open' },
    notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.PIP || mongoose.model('PIP', PIPSchema);
