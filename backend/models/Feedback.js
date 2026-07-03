const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    relation: { type: String, enum: ['Peer', 'Manager', 'Direct Report', 'Customer', 'Other'], default: 'Peer' },
    comments: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    cycle: { type: mongoose.Schema.Types.ObjectId, ref: 'PerformanceCycle' }
}, { timestamps: true });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
