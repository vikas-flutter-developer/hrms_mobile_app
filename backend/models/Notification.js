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

notificationSchema.post('save', function (doc) {
    try {
        const NotificationModel = mongoose.model('Notification');
        const io = NotificationModel.ioInstance;
        if (io) {
            const recipientRoom = doc.recipientId.toString();
            io.to(recipientRoom).emit('newNotification', {
                _id: doc._id,
                recipientId: doc.recipientId,
                title: doc.title,
                message: doc.message,
                link: doc.link,
                createdAt: doc.createdAt
            });
            console.log(`🔔 [Socket]: Emitted newNotification to room ${recipientRoom}: "${doc.title}"`);
        } else {
            console.log("🔔 [Socket]: Cannot send push notification, Socket.io ioInstance not attached to Notification model.");
        }
    } catch (err) {
        console.error("🔔 [Socket]: Notification push failed:", err.message);
    }
});

module.exports = mongoose.model('Notification', notificationSchema);
