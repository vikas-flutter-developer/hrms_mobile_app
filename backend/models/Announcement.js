const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    targetAudience: { type: String, enum: ['All', 'Specific Department', 'Specific Users'], default: 'All' },
    targetDepartment: { type: String },
    targetDepartments: [{ type: String }],
    targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    targetRoles: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'createdByModel' },
    createdByModel: { type: String, enum: ['Admin', 'Employee'], default: 'Admin' },
    isPinned: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null }, // null = never expires
    visibleForHours: { type: Number, default: null } // e.g. 24, 48, 72, 168 (7 days), null = permanent
}, { timestamps: true });

module.exports = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);