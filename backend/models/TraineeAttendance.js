const mongoose = require('mongoose');

const TraineeAttendanceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
  trainingProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram', required: true },
  traineeEmail: { type: String, required: true },
  date: { type: String, required: true }, // "YYYY-MM-DD"
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' }
}, { timestamps: true });

module.exports = mongoose.models.TraineeAttendance || mongoose.model('TraineeAttendance', TraineeAttendanceSchema);
