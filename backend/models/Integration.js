// backend/models/Integration.js
const mongoose = require('mongoose');

const IntegrationSchema = new mongoose.Schema({
    companyId: {
        type: String,
        required: true,
        unique: true
    },
    apiKey: { type: String, required: true, unique: true },
    webhookUrl: { type: String, default: '' },
    webhookSecret: { type: String, default: () => `whsec_${require('crypto').randomBytes(16).toString('hex')}` },
    
    // 👇 BADLAV YAHAN HAI: Category 2 ke fields add kiye
    slackWebhookUrl: { type: String, default: '' },
    teamsWebhookUrl: { type: String, default: '' },
    whatsappApiToken: { type: String, default: '' },
    whatsappPhoneNumberId: { type: String, default: '' },

    isActive: { type: Boolean, default: true },
    usageMetrics: {
        totalRequests: { type: Number, default: 0 },
        webhookDeliveries: { type: Number, default: 0 },
        lastUsedAt: { type: Date }
    },
    
    // Module 13 Extensions
    zoomToken: {
        accessToken: String,
        refreshToken: String,
        expiry: Date,
        connected: { type: Boolean, default: false }
    },
    googleWorkspaceToken: {
        accessToken: String,
        refreshToken: String,
        expiry: Date,
        connected: { type: Boolean, default: false }
    },
    quickbooksConfig: {
        realmId: String,
        accessToken: String,
        refreshToken: String,
        connected: { type: Boolean, default: false }
    },
    tallyConfig: {
        endpoint: String,
        username: String,
        connected: { type: Boolean, default: false }
    },
    biometricConfig: {
        deviceIp: String,
        port: String,
        apiKey: String,
        connected: { type: Boolean, default: false }
    }
}, { timestamps: true });

module.exports = mongoose.model('Integration', IntegrationSchema);