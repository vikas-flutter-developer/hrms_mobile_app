const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'employeeModel' },
    employeeModel: { type: String, required: true, enum: ['Employee', 'Admin', 'Hr'], default: 'Employee' },
    isSuperAdminTicket: { type: Boolean, default: false },
    subject: { type: String, required: true, trim: true },
    category: { type: String, required: true }, // e.g. IT Support, HR Query, Admin Request, etc.
    description: { type: String, required: true },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    resolutionNotes: { type: String },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Superadmin', default: null },
    isEscalated: { type: Boolean, default: false },
    slaDeadline: { type: Date },
    resolvedAt: { type: Date },
    thread: [{
        senderId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'thread.senderModel' },
        senderModel: { type: String, required: true, enum: ['Employee', 'Admin', 'Hr', 'SuperAdmin', 'Superadmin'] },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, { 
  timestamps: true,
  strictPopulate: false
});

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);