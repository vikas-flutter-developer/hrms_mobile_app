const mongoose = require('mongoose');

const VersionEntrySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    version: { type: Number, required: true },
    filePath: { type: String, required: true },
    fileName: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    notes: { type: String, trim: true }
}, { _id: true });

const EmployeeDocumentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['ID Proof', 'Educational Certificate', 'Experience Letter', 'Contract', 'Visa/Passport', 'Other'], required: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    expiryDate: { type: Date },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['Pending Verification', 'Verified', 'Rejected'], default: 'Pending Verification' },

    // E3: Access Control
    accessLevel: { type: String, enum: ['Public', 'HR Only', 'Admin Only'], default: 'HR Only' },

    // E4: Version History
    versions: [VersionEntrySchema]
}, { timestamps: true });

module.exports = mongoose.models.EmployeeDocument || mongoose.model('EmployeeDocument', EmployeeDocumentSchema);
