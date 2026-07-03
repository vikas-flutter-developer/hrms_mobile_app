const mongoose = require('mongoose');

const ScheduledReportSchema = new mongoose.Schema({
  reportType: { type: String, required: true }, // e.g. 'growth', 'revenue', 'user_activity', 'subscription'
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  recipients: [{ type: String, required: true }],
  format: { type: String, enum: ['csv', 'pdf', 'excel'], default: 'excel' },
  lastRunAt: { type: Date },
  nextRunAt: { type: Date },
  status: { type: String, enum: ['active', 'paused'], default: 'active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Superadmin' }
}, { timestamps: true });

module.exports = mongoose.model('ScheduledReport', ScheduledReportSchema);
