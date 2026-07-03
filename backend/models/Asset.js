const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    serialNumber: { type: String, trim: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    issueDate: { type: Date },
    returnDate: { type: Date },
    condition: { type: String, enum: ['New', 'Good', 'Damaged', 'Under Repair', 'Refurbished'], default: 'New' },
    status: { type: String, enum: ['Available', 'Assigned', 'Retired'], default: 'Available' },
    purchaseValue: { type: Number, default: 0 },
    depreciationRate: { type: Number, default: 0 }, // percentage per year
    nextMaintenanceDate: { type: Date }
}, { timestamps: true });

AssetSchema.index({ company: 1, serialNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Asset || mongoose.model('Asset', AssetSchema);