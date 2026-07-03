const mongoose = require('mongoose');

const AttendanceRegularizationSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    requestedStatus: {
        type: String,
        required: true,
        enum: ['Present', 'Half-Day', 'Work From Home', 'On Duty']
    },
    reason: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewNote: { type: String, trim: true, default: '' },
    actionedByName: { type: String },
    actionedByIdString: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.AttendanceRegularization
    || mongoose.model('AttendanceRegularization', AttendanceRegularizationSchema);
