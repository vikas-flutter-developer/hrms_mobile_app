const mongoose = require('mongoose');

const DesignationSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    title: { type: String, required: true }
}, { timestamps: true });

// Ensure designation titles are unique within a company
DesignationSchema.index({ company: 1, title: 1 }, { unique: true });

module.exports = mongoose.models.Designation || mongoose.model('Designation', DesignationSchema);
