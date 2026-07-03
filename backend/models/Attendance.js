const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    checkIn: { type: String },
    checkOut: { type: String },
    hoursWorked: { type: Number, default: 0 },
    status: { type: String, enum: ['Present', 'Late', 'Absent', 'Half-Day', 'Early Leave', 'Overtime', 'Leave'], default: 'Absent' },

    // Shift & Overtime tracking
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },
    shiftName: { type: String, default: 'General' },
    overtimeHours: { type: Number, default: 0 },
    nightShiftAllowancePercent: { type: Number, default: 0 },

    // Regularization
    isRegularized: { type: Boolean, default: false },
    regularizationReason: { type: String },
    regularizationStatus: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected'], default: 'None' },

    // Geolocation/Check-in Method
    checkInMethod: { type: String, default: 'Web' },
    checkOutMethod: { type: String, default: 'Web' },
    locationCoordinates: { type: String, default: '' },
    checkInCoordinates: { type: String, default: '' },
    checkOutCoordinates: { type: String, default: '' },
    checkInImage: { type: String, default: '' },
    holidayType: { type: String, enum: ['None', 'National', 'Optional', 'Regional'], default: 'None' }
}, { timestamps: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);