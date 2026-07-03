const mongoose = require('mongoose');

const EmployeeSkillSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    skillName: { type: String, required: true, trim: true },
    proficiencyLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Beginner' },
    gapIdentified: { type: Boolean, default: false },
    gapDescription: { type: String },
    lastAssessed: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.EmployeeSkill || mongoose.model('EmployeeSkill', EmployeeSkillSchema);
