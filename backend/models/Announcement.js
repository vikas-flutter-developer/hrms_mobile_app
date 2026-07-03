const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    targetAudience: { type: String, enum: ['All', 'Specific Department', 'Specific Users'], default: 'All' },
    targetDepartment: { type: String }, // Used if targetAudience is 'Specific Department' (legacy single)
    targetDepartments: [{ type: String }], // New: array of department names; empty = company-wide
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }], // specific users for personal notifications
    targetRoles: [{ type: String }], // e.g. ['admin', 'hr']
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'createdByModel' },
    createdByModel: { type: String, enum: ['Admin', 'Employee'], default: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);