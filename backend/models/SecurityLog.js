const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    userEmail: { type: String, default: 'System/Guest' },
    userRole: { type: String, default: 'Guest' },
    companyName: { type: String, default: 'Global HQ' },
    category: { 
        type: String, 
        enum: ['ADMIN_ACTION', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'SUSPICIOUS_ALERT', 'DATA_EXPORT', 'IP_RULE_CHANGE'], 
        required: true 
    },
    details: { type: String, required: true },
    ipAddress: { type: String, default: '127.0.0.1' },
    deviceInfo: { type: String, default: 'Macintosh / Chrome' },
    severity: { type: String, enum: ['Info', 'Warning', 'Critical'], default: 'Info' },
    originFile: { type: String, default: '' },
    originLine: { type: String, default: '' },
    apiRoute: { type: String, default: '' },
    mitigationSteps: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', securityLogSchema);