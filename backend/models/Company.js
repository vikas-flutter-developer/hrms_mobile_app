const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    // 👤 Basic Info
    companyName: { type: String, required: true },
    logo: { type: String, default: '' },
    adminEmail: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    alternatePhone: { type: String },
    
    // 🏢 Company Profile Details
    companyType: { type: String, enum: ['Startup', 'SME', 'Enterprise', 'MNC'], default: 'Startup' },
    industryType: { type: String, default: 'IT' },
    companySize: { type: String, enum: ['1-10', '11-50', '51-200', '200+'], default: '1-10' },
    website: { type: String },
    establishedYear: { type: Number },
    
    // 📜 Legal & Compliance (Govt IDs)
    gstNumber: { type: String },
    panNumber: { type: String },
    tanNumber: { type: String },
    regNumber: { type: String },
    
    // 📍 Location Details
    address: { type: String },
    branchAddresses: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
    pinCode: { type: String },
    
    // 🌐 Social Media & Digital Profile
    linkedIn: { type: String },
    socialLinks: { type: String },
    
    // ⚙️ System Controls & Billing
    subscriptionPlan: { 
        type: String, 
        enum: ['Free Trial', 'Starter', 'Business', 'Enterprise'], 
        default: 'Free Trial' 
    },
    status: { 
        // 👇 Naye advanced status options add kiye hain
        type: String, 
        enum: ['Pending Approval', 'Active', 'Suspended', 'Blacklisted'], 
        default: 'Pending Approval' 
    },
    totalEmployees: { type: Number, default: 0 },

    // 💰 Revenue Tracking (Super Admin Dashboard)
    mrr: { type: Number, default: 0 },   // Monthly Recurring Revenue in ₹

}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);