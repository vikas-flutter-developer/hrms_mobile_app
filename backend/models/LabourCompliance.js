const mongoose = require('mongoose');

const LabourComplianceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    law: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    frequency: { type: String, trim: true }, // e.g., 'Annual', 'Monthly', 'Quarterly'
    lastChecked: { type: Date },
    nextDueDate: { type: Date },
    status: {
        type: String,
        enum: ['Compliant', 'Non-Compliant', 'Review Required'],
        default: 'Review Required'
    },
    notes: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.models.LabourCompliance || mongoose.model('LabourCompliance', LabourComplianceSchema);
