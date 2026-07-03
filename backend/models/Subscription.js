const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  planName: { type: String, required: true },
  status: { type: String, enum: ['Active', 'Expired', 'Cancelled', 'Pending'], default: 'Active' },
  startDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: true },
  maxEmployees: { type: Number, required: true },
  pricePaid: { type: Number, required: true },
  billingCycle: { type: String, enum: ['Monthly', 'Yearly'], default: 'Monthly' }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
