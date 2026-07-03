const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  // 1. System & Authentication
  adminId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true, trim: true },
  alternatePhone: { type: String, trim: true, default: '' },

  // 2. Corporate Identity
  companyName: { type: String, required: true, trim: true },
  companyLogo: { type: String, default: '' }, // Stores Base64 string or image URL
  signature: { type: String, default: '' }, // ✅ NEW: CEO/Admin Signature (Base64)
  website: { type: String, trim: true, default: '' }, // ✅ NEW: Website Link added
  socialLinks: {
    linkedin: { type: String, default: '' },
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  companyType: { type: String, enum: ['Startup', 'SME', 'Enterprise', 'MNC'], default: 'Startup' },
  industryType: { type: String, default: 'IT' },
  companySizeRange: {
    type: String,
    default: '1-10',
    enum: ['1-10', '11-50', '51-200', '201-500', '500+', '200+']
  },
  companyStartDate: { type: Date, required: true },
  branchLocation: { type: String, default: 'HQ', trim: true },
  branchLat: { type: Number, default: null },
  branchLng: { type: Number, default: null },
  branches: [{
    name: { type: String, required: true },
    address: { type: String, required: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    type: { type: String, enum: ['HQ', 'Branch'], default: 'Branch' }
  }],
  address: { type: String, trim: true, default: '' },
  city: { type: String, trim: true, default: '' },
  state: { type: String, trim: true, default: '' },
  country: { type: String, trim: true, default: 'India' },
  pinCode: { type: String, trim: true, default: '' },

  // 3. Legal & Compliance
  registrationNumber: { type: String, trim: true, default: '' }, // ✅ NEW: Company Registered ID added
  panId: { type: String, trim: true, uppercase: true },
  gstId: { type: String, default: '', trim: true, uppercase: true },
  tanId: { type: String, trim: true, uppercase: true },

  // 4. System & Localization Settings
  financialYear: { type: String, enum: ['Apr-Mar', 'Jan-Dec'], default: 'Apr-Mar' },
  workingDays: { type: String, enum: ['Mon-Fri', 'Mon-Sat'], default: 'Mon-Fri' },
  workingHours: { type: String, default: '9 AM - 6 PM' },
  timeZone: { type: String, default: 'IST' },
  currency: { type: String, default: 'INR' },
  dateFormat: { type: String, default: 'DD/MM/YYYY' },
  language: { type: String, default: 'English' },

  // 5. Subscription Management
  hasPaidTier: { type: Boolean, default: false },
  employeeQuotaTarget: { type: Number, default: 10 },
  departmentQuotaTarget: { type: Number, default: 10 },
  storageQuotaTarget: { type: Number, default: 10 },
  selectedPlanName: { type: String, default: 'None', trim: true },
  planPrice: { type: String, default: '0', trim: true },
  subscriptionExpiry: { type: Date },
  autoRenew: { type: Boolean, default: false },
  hasUsedTrial: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending Approval', 'Active', 'Suspended', 'Blacklisted'], default: 'Pending Approval' },
  createdBySuperAdmin: { type: Boolean, default: false },
  paymentMethod: { type: String, default: '' },
  paymentProof: { type: String, default: '' },

  // 6. Access & Configuration
  isHrLeavePowerEnabled: { type: Boolean, default: true },
  hrSuperAdminHelpdeskPermission: { type: Boolean, default: false },
  customDepartments: [{ type: String, trim: true }],
  customRoles: [{ type: String, trim: true, lowercase: true }],
  assetCategories: [{ type: String, trim: true }], // Custom asset categories (empty = use global defaults)

  // 7. System Integrations (SMTP)
  smtpSettings: {
    host: { type: String, default: '', trim: true },
    port: { type: Number, default: 587 },
    user: { type: String, default: '', trim: true },
    pass: { type: String, default: '', trim: true }
  },

  // 8. IP Whitelisting
  ipWhitelist: { type: String, default: '' },

  // 9. Hardware & Advanced Attendance Settings
  attendanceSettings: {
    enableBiometric: { type: Boolean, default: false },
    biometricApiKey: { type: String, default: '' },
    enableMobileCheckIn: { type: Boolean, default: false },
    enableQRCode: { type: Boolean, default: false },
    qrCodeData: { type: String, default: '' }
  },

  // 10. External API Integrations (Recruitment)
  jobBoardIntegrations: {
    linkedin: { type: String, default: '' },
    naukri: { type: String, default: '' },
    indeed: { type: String, default: '' }
  },

  // Relationships
  Employee: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }]
}, { timestamps: true });

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);