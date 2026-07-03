const mongoose = require('mongoose');

const SubscriptionPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  priceMonthly: { type: Number, required: true },
  priceYearly: { type: Number, required: true },
  maxEmployees: { type: Number, default: 50 },
  maxHrUsers: { type: Number, default: 3 },
  maxDepartments: { type: Number, default: 10 },
  storageLimitGB: { type: Number, default: 10 },
  modules: {
    globalChat: { type: Boolean, default: false },
    announcement: { type: Boolean, default: false },
    asset: { type: Boolean, default: false },
    recruitment: { type: Boolean, default: false },
    compliance: { type: Boolean, default: false },
    training: { type: Boolean, default: false },
    projects: { type: Boolean, default: false },
    documents: { type: Boolean, default: false },
    expense: { type: Boolean, default: false },
    performance: { type: Boolean, default: false }
  },
  isPopular: { type: Boolean, default: false },
  isRecommended: { type: Boolean, default: false },
  yearlyDiscountPercent: { type: Number, default: 20 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
