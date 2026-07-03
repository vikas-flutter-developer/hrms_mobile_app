const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userRole: { type: String, required: true },
    companyName: { type: String, default: 'Global HQ' },
    ipAddress: { type: String, default: '127.0.0.1' },
    deviceInfo: { type: String, default: 'Trusted Device' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('UserSession', userSessionSchema);