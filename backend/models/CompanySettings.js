const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  companyName: { type: String, required: true },
  logoUrl: { type: String, default: '' },
  website: { type: String, default: '' },
  companyType: { 
    type: String, 
    enum: ['Startup', 'SME', 'Enterprise', 'MNC'],
    default: 'SME'
  },
  industryType: { 
    type: String, 
    enum: ['IT', 'Software', 'SaaS', 'Product', 'Service', 'Other'],
    default: 'IT'
  },
  registrationNumber: { type: String, default: '' },
  gstin: { type: String, default: '' },
  pan: { type: String, default: '' },
  tan: { type: String, default: '' },
  headquartersAddress: { type: String, default: '' },
  officialEmail: { type: String, default: '' },
  officialPhone: { type: String, default: '' },
  socialLinks: {
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    facebook: { type: String, default: '' }
  },
  financialYear: { 
    type: String, 
    enum: ['Apr-Mar', 'Jan-Dec'],
    default: 'Apr-Mar'
  },
  workingDays: { 
    type: String, 
    enum: ['Mon-Fri', 'Mon-Sat'],
    default: 'Mon-Fri'
  },
  workingHours: { type: String, default: '9:00 AM - 6:00 PM' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  currency: { type: String, default: 'INR' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  language: { type: String, default: 'English' },
  jobBoards: [{
    name: { type: String, required: true },
    apiKey: { type: String, default: '' },
    isConnected: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false }
  }],
  accountingApi: {
    provider: { type: String, enum: ['QuickBooks', 'Xero', 'Stripe', 'None'], default: 'None' },
    apiKey: { type: String, default: '' },
    isConnected: { type: Boolean, default: false }
  },
  ssoSettings: {
    enabled: { type: Boolean, default: false },
    provider: { type: String, enum: ['Google', 'AzureAD', 'Okta', 'Auth0', 'SAML', 'OIDC', 'None'], default: 'None' },
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' },
    tenantId: { type: String, default: '' },
    idpUrl: { type: String, default: '' },
    isConnected: { type: Boolean, default: false }
  },
  thirdPartyIntegrations: {
    zoom: {
      clientId: { type: String, default: '' },
      clientSecret: { type: String, default: '' },
      isConnected: { type: Boolean, default: false }
    },
    googleWorkspace: {
      clientId: { type: String, default: '' },
      clientSecret: { type: String, default: '' },
      isConnected: { type: Boolean, default: false }
    },
    tally: {
      apiKey: { type: String, default: '' },
      endpointUrl: { type: String, default: '' },
      isConnected: { type: Boolean, default: false }
    }
  },
  expenseLimits: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      Travel: 0,
      Food: 0,
      Accommodation: 0,
      OfficeSupplies: 0,
      Other: 0
    }
  },
  attendanceSettings: {
    allowWebCheckIn: { type: Boolean, default: true },
    allowHardwareCheckIn: { type: Boolean, default: false },
    hardwareIntegration: {
      apiKey: { type: String, default: '' },
      webhookUrl: { type: String, default: '' }
    },
    allowMobileCheckIn: { type: Boolean, default: false },
    allowQRCodeCheckIn: { type: Boolean, default: false },
    qrCodeData: { type: String, default: '' }
  },
  leaveSettings: {
    hrCanApprove: { type: Boolean, default: false },
    globalLimits: {
      casual: { type: Number, default: 12 },
      medical: { type: Number, default: 10 },
      paid: { type: Number, default: 15 }
    }
  },
  hrSuperAdminHelpdeskPermission: { type: Boolean, default: false },
  recruitmentSettings: {
    manualTimeToHire: { type: Number, default: 0 },
    manualCostPerHire: { type: Number, default: 0 }
  },
  payrollSettings: {
    includeHolidays: { type: Boolean, default: true },
    includeLeaves: { type: Boolean, default: true },
    basis: { type: String, enum: ['flat_30', 'actual_month_days', 'working_days'], default: 'flat_30' },
    enabledComponents: { type: [String], default: [] }
  }
}, { timestamps: true });

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
