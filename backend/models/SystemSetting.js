const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
    // 🛑 Global System Controls & Versioning
    maintenanceMode: { type: Boolean, default: false },
    maintenanceType: { type: String, enum: ['Full', 'Partial'], default: 'Full' },
    maintenanceMessage: { 
        type: String, 
        default: 'System is currently undergoing scheduled maintenance. Please check back soon.' 
    },
    appVersion: { type: String, default: '1.0.0' },
    forceUpdate: { type: Boolean, default: false },
    
    // 🧩 Module Toggles (Global)
    modules: {
        attendance: { type: Boolean, default: true },
        leave: { type: Boolean, default: true },
        payroll: { type: Boolean, default: true },
        performance: { type: Boolean, default: false },
        recruitment: { type: Boolean, default: false },
        training: { type: Boolean, default: true },
        asset: { type: Boolean, default: true },
        expense: { type: Boolean, default: true },
        document: { type: Boolean, default: true },
        chat: { type: Boolean, default: true },
        announcements: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        shift: { type: Boolean, default: true },
        overtime: { type: Boolean, default: true }
    },

    // 🔌 Available Integrations (Globally Managed by Super Admin)
    availableIntegrations: {
        zoom: { type: Boolean, default: true },
        googleWorkspace: { type: Boolean, default: true },
        tally: { type: Boolean, default: true },
        slack: { type: Boolean, default: true }
    },

    globalSsoSettings: {
        enabled: { type: Boolean, default: true },
        supportedProviders: { 
            type: [String], 
            default: ['Google', 'AzureAD', 'Okta', 'Auth0', 'SAML', 'OIDC'] 
        },
        plansAccess: { 
            type: [String], 
            default: ['Enterprise'] 
        }
    },
    googleClientId: { type: String, default: '' },
    googleClientSecret: { type: String, default: '' },
    microsoftClientId: { type: String, default: '' },
    oktaDomain: { type: String, default: '' },

    // ⚖️ Legal & Compliance (From your Settings Tab)
    termsAndConditions: { type: String, default: '' },
    privacyPolicy: { type: String, default: '' },
    refundPolicy: { type: String, default: '' },
    gdprToolsEnabled: { type: Boolean, default: true },
    dataRetentionMonths: { type: Number, default: 12 },

    // 🎨 Branding Settings
    platformName: { type: String, default: 'HRMS Platform' },
    supportEmail: { type: String, default: 'support@company.com' },

    // 🌐 Default Localization & Global Constraints
    defaultLanguage: { type: String, default: 'English' },
    defaultTimezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'YYYY-MM-DD' },
    currency: { type: String, default: 'INR' },
    storageLimitPerCompanyGB: { type: Number, default: 10 },
    fileUploadSizeLimitMB: { type: Number, default: 10 },
    apiRateLimit: { type: Number, default: 100 },

    // 📧 Notification Gateways (For Announcements)
    smtpSettings: {
        host: { type: String, default: '' },
        port: { type: Number, default: 587 },
        user: { type: String, default: '' },
        password: { type: String, default: '' }
    },
    smsSettings: {
        provider: { type: String, default: 'Twilio' },
        apiKey: { type: String, default: '' },
        senderId: { type: String, default: '' }
    },

    // 📦 Global Asset Categories (Super Admin managed defaults)
    assetCategories: { 
        type: [String], 
        default: ['Laptop', 'Mobile', 'Monitor', 'Phone', 'Access Card', 'Vehicle', 'Furniture', 'Other'] 
    },

    // 💳 Global Billing & Payment Gateways Config
    taxRateGST: { type: Number, default: 18 },
    autoRenewalEnabled: { type: Boolean, default: true },
    paymentGateways: {
        razorpayKey: { type: String, default: '' },
        razorpaySecret: { type: String, default: '' },
        stripeKey: { type: String, default: '' },
        stripeSecret: { type: String, default: '' },
        payuMerchantKey: { type: String, default: '' },
        payuMerchantSalt: { type: String, default: '' }
    },
    enablePasswordComplexity: { type: Boolean, default: false },
    passwordComplexity: { type: String, default: 'Strong' },
    passwordMinLength: { type: Number, default: 8 },
    enable2FA: { type: Boolean, default: false },
    enforce2FA: { type: String, default: 'Admin Only' },
    enableSessionTimeout: { type: Boolean, default: false },
    sessionTimeout: { type: String, default: '30 Minutes' },
    sessionTimeoutMinutes: { type: Number, default: 30 },
    enableIpWhitelisting: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
