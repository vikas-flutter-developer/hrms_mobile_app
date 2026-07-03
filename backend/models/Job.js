const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  jobType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern'], required: true },
  experienceRequired: { type: String },
  salaryRange: { type: String },
  location: { type: String },
  deadline: { type: Date },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open' },
  postedTo: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.Job || mongoose.model('Job', JobSchema);