const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    department: { type: String, trim: true },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Overseer
    teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },       // Hands-on manager
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],      // Team Members
    status: { 
        type: String, 
        enum: ['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold'], 
        default: 'Not Started' 
    },
    startDate: { type: Date, default: Date.now },
    deadline: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: true });

module.exports = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
