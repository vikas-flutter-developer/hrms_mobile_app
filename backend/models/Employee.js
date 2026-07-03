const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
  // Core Identity
  empId: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  gender: { type: String, required: true, trim: true },
  dob: { type: Date },
  bloodGroup: { type: String, trim: true },
  age: { type: Number },
  email: { type: String, required: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },

  // Emergency Contact
  emergencyContactName: { type: String, trim: true },
  emergencyContactRelation: { type: String, trim: true },
  emergencyContactPhone: { type: String, trim: true },

  // Employment Details
  role: { type: String, required: true, lowercase: true, trim: true, default: 'employee' },
  positionLevel: { type: String, default: 'Team Member' },
  department: { type: String, required: true, trim: true },
  employmentType: { type: String, default: 'Full-time' },
  workLocation: { type: String, enum: ['Office', 'Remote', 'Hybrid'], default: 'Office' },
  joinDate: { type: Date, default: Date.now },
  probationEndDate: { type: Date },

  status: { type: String, enum: ['Active', 'Inactive', 'Notice Period', 'Archived', 'Offboarded'], default: 'Active' },
  archivedAt: { type: Date, default: null },
  assignedLeader: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },

  // Payroll & Compliance Details
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  panNumber: { type: String, trim: true, uppercase: true },
  aadhaarNumber: { type: String, trim: true },
  uanNumber: { type: String, trim: true },
  esiNumber: { type: String, trim: true },

  // Document Uploads
  profilePhoto: { type: String, default: null },
  panCard: { type: String, default: null },
  aadhaarCard: { type: String, default: null },
  resume: { type: String, default: null },

  // Background Info
  previousCompany: { type: String, default: 'None', trim: true },
  previousRole: { type: String, default: 'None', trim: true },
  yearsOfExperience: { type: String, default: '0 Years', trim: true },
  skills: [{ type: String, trim: true }],
  education: [{
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    year: { type: String, trim: true }
  }],

  // Exit / Offboarding
  exitDate: { type: Date, default: null },
  exitReason: { type: String, trim: true, default: null },
  exitNotes: { type: String, trim: true, default: null },
  exitInterviewNotes: { type: String, trim: true, default: null },
  fnfSettlementStatus: { type: String, enum: ['Pending', 'Processed', 'Completed'], default: 'Pending' },

  // Career Lifecycle
  jobHistory: [{
      eventType: { type: String, enum: ['Promotion', 'Transfer', 'Role Change', 'Increment', 'Other'] },
      date: { type: Date, default: Date.now },
      previousRole: String,
      newRole: String,
      newSalary: Number,
      previousDepartment: String,
      newDepartment: String,
      newWorkLocation: String,
      newGratuityPercentage: Number,
      notes: String,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  }],

  // Salary Revisions
  salaryHistory: [{
      date: { type: Date, default: Date.now },
      previousSalary: Number,
      newSalary: Number,
      reason: String,
      processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
  }],

  // Shift Assignment
  shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },

  // Salary
  salary: { type: Number, default: 60000 },
  baseSalary: { type: Number, default: 60000 },

  // Leave Balances
  leaveBalances: {
    casual: { type: Number, default: 12 },
    medical: { type: Number, default: 10 },
    paid: { type: Number, default: 15 }
  },

  // Gratuity Rule
  gratuityPercentage: { type: Number, default: 0 },
  incentivePercentage: { type: Number, default: 0 },

  Admin: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

// TTL index to automatically delete archived profiles after 24 hours
EmployeeSchema.index({ archivedAt: 1 }, { expireAfterSeconds: 86400 });

// Company-scoped unique employee IDs
EmployeeSchema.index({ company: 1, empId: 1 }, { unique: true });
EmployeeSchema.index({ company: 1, email: 1 }, { unique: true });

module.exports = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);