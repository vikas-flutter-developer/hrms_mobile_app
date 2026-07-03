const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription', required: true },
  amount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Unpaid', 'Overdue', 'Refunded'], default: 'Paid' },
  paymentMethod: { type: String, default: 'Credit Card' },
  paymentDate: { type: Date },
  dueDate: { type: Date },
  billingPeriodStart: { type: Date },
  billingPeriodEnd: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
