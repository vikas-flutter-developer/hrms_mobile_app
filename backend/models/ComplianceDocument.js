const mongoose = require('mongoose');

const ComplianceDocumentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    filePath: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    expiryDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.ComplianceDocument || mongoose.model('ComplianceDocument', ComplianceDocumentSchema);
