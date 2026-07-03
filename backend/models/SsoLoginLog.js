const mongoose = require('mongoose');

const SsoLoginLogSchema = new mongoose.Schema({
    email: { type: String, required: true },
    companyName: { type: String, required: true },
    provider: { type: String, required: true },
    status: { type: String, enum: ['Success', 'Failed'], required: true },
    message: { type: String, default: '' },
    ipAddress: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SsoLoginLog', SsoLoginLogSchema);
