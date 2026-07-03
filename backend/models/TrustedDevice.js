const mongoose = require('mongoose');

const TrustedDeviceSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    deviceInfo: { type: String, required: true },
    ipAddress: { type: String, required: true },
    status: { type: String, enum: ['Trusted', 'Blocked', 'Pending'], default: 'Pending' },
    lastSeen: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique combination of email + device + IP
TrustedDeviceSchema.index({ userEmail: 1, deviceInfo: 1, ipAddress: 1 }, { unique: true });

module.exports = mongoose.model('TrustedDevice', TrustedDeviceSchema);
