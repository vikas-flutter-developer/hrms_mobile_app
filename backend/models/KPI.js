const mongoose = require('mongoose');

const KPISchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    department: { type: String, trim: true, default: null },
    unit: { type: String, trim: true },
    targetValue: { type: Number },
    baseline: { type: Number },
    currentValue: { type: Number, default: 0 },
    weight: { type: Number, default: 1 },
    frequency: { type: String, enum: ['Quarterly', 'Half-Yearly', 'Yearly', 'Monthly'], default: 'Quarterly' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.KPI || mongoose.model('KPI', KPISchema);
