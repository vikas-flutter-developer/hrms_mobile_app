const mongoose = require('mongoose');

const CustomRoleSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    title: { type: String, required: true },
    level: { type: Number, default: 5 },
    salaryGrade: { type: String, default: '' },
    gratuityPercentage: { type: Number, default: 0 },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomRole', default: null }
}, { timestamps: true });

// Ensure role titles are unique within a company
CustomRoleSchema.index({ company: 1, title: 1 }, { unique: true });

module.exports = mongoose.models.CustomRole || mongoose.model('CustomRole', CustomRoleSchema);