const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        refPath: 'recipientModel'
    },
    recipientModel: { 
        type: String, 
        required: true, 
        enum: ['Employee', 'Admin', 'Superadmin'] 
    },
    title: { 
        type: String, 
        required: true 
    },
    message: { 
        type: String, 
        required: true 
    },
    link: {
        type: String,
        default: null
    },
    isSeen: { 
        type: Boolean, 
        default: false 
    },
    seenAt: { 
        type: Date 
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
