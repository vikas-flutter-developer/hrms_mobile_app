const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'senderModel' },
    senderModel: { type: String, enum: ['Employee', 'Admin'], required: true },
    content: { type: String, required: true },
    attachmentUrl: { type: String, default: null },
    attachmentType: { type: String, default: null },
    isGlobal: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
