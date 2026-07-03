const mongoose = require('mongoose');

const JobPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  requirements: { type: String },
  jobType: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Intern', 'Remote'], default: 'Full-time' },
  experienceRequired: { type: String },
  salaryRange: { type: String },
  location: { type: String },
  applicationDeadline: { type: Date },
  status: { type: String, enum: ['Open', 'Closed', 'Draft'], default: 'Open' },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: true });

module.exports = mongoose.models.JobPost || mongoose.model('JobPost', JobPostSchema);
