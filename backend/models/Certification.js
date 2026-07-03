const mongoose = require('mongoose');

const CertificationSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false },
    traineeName: { type: String },
    traineeEmail: { type: String },
    name: { type: String, required: true, trim: true },
    issuingAuthority: { type: String, trim: true },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    duration: { type: String },
    credentialId: { type: String, trim: true },
    credentialUrl: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.models.Certification || mongoose.model('Certification', CertificationSchema);
