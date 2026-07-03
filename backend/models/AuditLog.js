const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actionBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin', // Ya jo bhi aapke admin/user model ka naam hai
        required: true 
    },
    actionType: { 
        type: String, 
        enum: ['ROLE_CREATED', 'PERMISSION_CHANGED', 'ROLE_CLONED', 'ROLE_DELETED'],
        required: true
    },
    targetRole: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Role' 
    },
    details: { 
        type: String // Example: "Added 'delete_user' permission to HR Manager"
    }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);