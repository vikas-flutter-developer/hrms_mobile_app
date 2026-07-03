const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    round: { type: Number, default: 1 },
    interviewType: { type: String, enum: ['Technical', 'HR', 'Managerial', 'Task'], default: 'Technical' },
    scheduledDate: { type: Date, required: true },
    mode: { type: String, enum: ['In-person', 'Video Call', 'Phone'], default: 'Video Call' },
    meetingLink: { type: String },
    status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled', 'No Show'], default: 'Scheduled' },
    feedback: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5 } // 1-5 scale
}, { timestamps: true });

module.exports = mongoose.models.Interview || mongoose.model('Interview', InterviewSchema);