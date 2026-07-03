const mongoose = require('mongoose');

const CompanyDocumentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: String, enum: ['Policy', 'Handbook', 'Compliance', 'Template', 'Other'], default: 'Policy' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    accessControl: [{ type: String }], // e.g., ['admin', 'hr', 'employee'] - roles that can view
    version: { type: String, default: '1.0' }
}, { timestamps: true });

module.exports = mongoose.models.CompanyDocument || mongoose.model('CompanyDocument', CompanyDocumentSchema);
