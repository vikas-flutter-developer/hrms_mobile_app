const mongoose = require('mongoose');

const ComplianceRecordSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    type: { 
        type: String, 
        enum: ['Provident Fund (PF)', 'ESI', 'Professional Tax', 'TDS / Income Tax', 'Labour Law', 'Gratuity', 'Other'], 
        required: true 
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    filingDate: { type: Date },
    status: { type: String, enum: ['Pending', 'Filed', 'Overdue'], default: 'Pending' },
    documentUrl: { type: String }, // Link to filed receipt or challan
    amountPaid: { type: Number, default: 0 },
    penalty: { type: Number, default: 0 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.ComplianceRecord || mongoose.model('ComplianceRecord', ComplianceRecordSchema);
