const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    name: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    type: { type: String, enum: ['National', 'Optional', 'Regional'], default: 'National' },
    state: { type: String, default: 'All' },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);
