const mongoose = require('mongoose');

const AppraisalSectionSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: String,
    comments: String,
    score: { type: Number }
}, { _id: false });

const PerformanceReviewSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceCycle', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    selfAppraisal: { type: [AppraisalSectionSchema], default: [] },
    managerAppraisal: { type: [AppraisalSectionSchema], default: [] },
    kpiAssessments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'KPI' }],
    rating: { type: Number, min: 1, max: 5 },
    status: { type: String, enum: ['Draft', 'Submitted', 'Reviewed', 'Finalized'], default: 'Draft' },
    overallComments: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.PerformanceReview || mongoose.model('PerformanceReview', PerformanceReviewSchema);
