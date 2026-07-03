const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    roleName: { 
        type: String, 
        required: true 
    },
    // Is it a Global role (SuperAdmin) or specific to a Company?
    scope: { 
        type: String, 
        enum: ['Global', 'Company'], 
        required: true 
    },
    // If scope is 'Company', which company does it belong to? (Null for Global)
    companyId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Company', 
        default: null,
        set: v => v === '' ? null : v
    },
    // List of permissions (e.g., ['create_user', 'delete_user', 'view_payroll'])
    permissions: [{ 
        type: String 
    }],
    // SuperAdmin Sub-roles category (Owner, Billing, etc.)
    subRoleCategory: {
        type: String,
        enum: ['Super Admin Owner', 'Billing Manager', 'Support Staff', 'Content Manager', 'Analytics Viewer', 'None'],
        default: 'None'
    },
    // Time-based access control (e.g., only access between 9 AM - 6 PM)
    timeBasedAccess: {
        isRestricted: { type: Boolean, default: false },
        startTime: { type: String, default: "09:00" }, // 24-hour format
        endTime: { type: String, default: "18:00" }
    }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);