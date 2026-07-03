const mongoose = require('mongoose');

const TrainingProgramSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    category: { type: String, enum: ['Technical', 'Soft Skills', 'Compliance', 'Leadership', 'Other'], default: 'Technical' },
    mode: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online' },
    startDate: { type: Date },
    endDate: { type: Date },
    trainer: { type: String }, // Can also be an ObjectId ref to an external/internal Trainer model if needed
    status: { type: String, enum: ['Planned', 'Ongoing', 'Completed', 'Cancelled'], default: 'Planned' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    trainees: [{
      name: { type: String, required: true },
      email: { type: String, required: true }
    }]
}, { timestamps: true });

module.exports = mongoose.models.TrainingProgram || mongoose.model('TrainingProgram', TrainingProgramSchema);
