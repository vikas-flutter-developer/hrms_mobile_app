const mongoose = require('mongoose');

const BlacklistedAccountSchema = new mongoose.Schema({
    companyName: { type: String, unique: true, lowercase: true, trim: true },
    email: { type: String, unique: true, lowercase: true, trim: true },
    blacklistedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.BlacklistedAccount || mongoose.model('BlacklistedAccount', BlacklistedAccountSchema);
