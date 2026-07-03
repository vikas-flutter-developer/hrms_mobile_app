const mongoose = require('mongoose');

const TrainingAssignmentSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    trainingProgram: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingProgram', required: true },
    status: { type: String, enum: ['Assigned', 'In Progress', 'Completed', 'Failed', 'Dropped'], default: 'Assigned' },
    completionDate: { type: Date },
    attendanceScore: { type: Number, min: 0, max: 100 },
    feedback: { type: String },
    effectivenessScore: { type: Number, min: 1, max: 5 },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.TrainingAssignment || mongoose.model('TrainingAssignment', TrainingAssignmentSchema);
