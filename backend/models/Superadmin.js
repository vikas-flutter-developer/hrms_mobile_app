const mongoose = require('mongoose');

const SuperadminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  subRole: { type: String, enum: ['Owner', 'Billing', 'Support', 'Analytics', 'Content'], default: 'Owner' },
  twoFactorEnabled: { type: Boolean, default: false },
  permissions: [{ type: String }],
  loginHistory: [{
    ip: String,
    device: String,
    timestamp: { type: Date, default: Date.now }
  }],
  activityLogs: [{
    action: String,
    module: String,
    timestamp: { type: Date, default: Date.now }
  }],
  admin: [
    { type: mongoose.Schema.Types.ObjectId, ref: "admin" }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Superadmin', SuperadminSchema);