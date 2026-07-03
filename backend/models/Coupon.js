const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true 
  },
  discountType: { 
    type: String, 
    enum: ['percentage', 'flat'], 
    required: true 
  },
  discountValue: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  expiryDate: { 
    type: Date, 
    default: null // null means never expires
  },
  maxUses: { 
    type: Number, 
    default: null // null means unlimited uses
  },
  usedCount: { 
    type: Number, 
    default: 0 
  },
  usedBy: [{
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    companyName: { type: String },
    usedAt: { type: Date, default: Date.now },
    planName: { type: String },
    originalAmount: { type: Number },
    discountApplied: { type: Number },
    finalAmountPaid: { type: Number }
  }]
}, { timestamps: true });

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
