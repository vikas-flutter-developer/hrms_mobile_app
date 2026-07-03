const mongoose = require('mongoose');

const AppraisalHistorySchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    review: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceReview', required: true },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceCycle' },
    rating: { type: Number, min: 1, max: 5 },
    finalizedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.AppraisalHistory || mongoose.model('AppraisalHistory', AppraisalHistorySchema);
