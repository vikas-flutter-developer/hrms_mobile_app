// const mongoose = require('mongoose');

// const EmployeeSchema = new mongoose.Schema({
//   // Core Identity
//   empId: { type: String, required: true, unique: true, trim: true },
//   name: { type: String, required: true, trim: true },
//   gender: { type: String, required: true, trim: true },
//   age: { type: Number, required: true },
//   email: { type: String, required: true, unique: true, trim: true, lowercase: true },
//   password: { type: String, required: true },

//   // System Parameters (Dynamic Strings to accept custom designations seamlessly)
//   role: { type: String, required: true, lowercase: true, trim: true, default: 'employee' },
//   department: { type: String, required: true, trim: true },
//   joinDate: { type: Date, default: Date.now },

//   // Profile Specifics
//   phone: { type: String, default: '', trim: true },
//   address: { type: String, default: '', trim: true },
//   profilePhoto: { type: String, default: null },
//   panCard: { type: String, default: null },
//   adharCard: {type: String, default: null },

//   // Background Info
//   previousCompany: { type: String, default: 'None', trim: true },
//   previousRole: { type: String, default: 'None', trim: true },
//   yearsOfExperience: { type: String, default: '0 Years', trim: true },
//   resume: { type: String, default: null },
//   // Self-referencing reporting management relationship hook
//   assignedLeader: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Employee',
//     default: null
//     },
//   Employee: [
//       { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }
//     ],

//   Admin: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Admin"
//   },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
// }, { timestamps: true });


// module.exports = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);