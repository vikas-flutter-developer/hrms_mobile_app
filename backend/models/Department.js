const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    capacity: { type: Number, required: true, default: 0 },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    createdAt: { type: Date, default: Date.now }
});

DepartmentSchema.index({ company: 1, name: 1 }, { unique: true });
DepartmentSchema.index({ company: 1, code: 1 }, { unique: true });

module.exports = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);