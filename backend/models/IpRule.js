const mongoose = require('mongoose');

const ipRuleSchema = new mongoose.Schema({
    ipAddress: { type: String, required: true, unique: true },
    ruleType: { type: String, enum: ['Whitelist', 'Blacklist'], required: true },
    reason: { type: String, default: 'Policy Configuration' }
}, { timestamps: true });

module.exports = mongoose.model('IpRule', ipRuleSchema);