const mongoose = require('mongoose');

// This is the SuperAdmin-specific broadcast model (separate from employee Announcement)
const superAdminBroadcastSchema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    priority: { type: String, enum: ['Standard', 'High', 'Critical'], default: 'Standard' },
    targetAudience: { type: String, enum: ['All', 'Active', 'Trial', 'Enterprise'], default: 'All' },
    targetCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Company' }],
    channels: {
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false },
        inApp: { type: Boolean, default: true }
    },
    status: { type: String, enum: ['Draft', 'Scheduled', 'Sent'], default: 'Sent' },
    scheduledAt: { type: Date },
    sentAt: { type: Date },
    readReceipts: [{ 
        userId: { type: mongoose.Schema.Types.ObjectId }, 
        readAt: { type: Date, default: Date.now } 
    }]
}, { timestamps: true });

module.exports = mongoose.models.SuperAdminBroadcast || mongoose.model('SuperAdminBroadcast', superAdminBroadcastSchema);
