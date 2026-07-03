const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String },
  resumeUrl: { type: String },
  status: {
    type: String,
    enum: ['Applied', 'Shortlisted', 'Interviewing', 'Offered', 'Hired', 'Rejected'],
    default: 'Applied'
  },
  interviewDate: { type: Date },
  feedback: { type: String },
  aiScore: { type: Number },
  onboardingChecklist: [{
    item: { type: String },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date }
  }]
}, { timestamps: true });

CandidateSchema.index(
  { updatedAt: 1 },
  { expireAfterSeconds: 36000, partialFilterExpression: { status: 'Rejected' } }
);

module.exports = mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);