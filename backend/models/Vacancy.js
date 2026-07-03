const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    jobType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern'], required: true },
    experienceRequired: { type: String },
    salaryRange: { type: String },
    location: { type: String },
    openings: { type: Number, default: 1 },
    applicationDeadline: { type: Date },
    status: { type: String, enum: ['Open', 'On Hold', 'Closed'], default: 'Open' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.Vacancy || mongoose.model('Vacancy', VacancySchema);