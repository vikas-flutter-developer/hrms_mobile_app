const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');

// Models
const TrainingProgram = require('../models/TrainingProgram');
const TrainingAssignment = require('../models/TrainingAssignment');
const Certification = require('../models/Certification');
const EmployeeSkill = require('../models/EmployeeSkill');

// =======================
// Training Program Routes
// =======================

router.get('/programs', verifyToken, async (req, res) => {
  try {
    const programs = await TrainingProgram.find({
      company: req.user.company
    }).populate('createdBy', 'name');
    res.status(200).json(programs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/programs', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      mode,
      startDate,
      endDate,
      trainer,
      status
    } = req.body;
    const newProgram = new TrainingProgram({
      company: req.user.company,
      title,
      description,
      category,
      mode,
      startDate,
      endDate,
      trainer,
      status,
      createdBy: req.user.id
    });
    const savedProgram = await newProgram.save();
    res.status(201).json(savedProgram);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/programs/:id', verifyToken, async (req, res) => {
  try {
    const updatedProgram = await TrainingProgram.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedProgram);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/programs/:id', verifyToken, async (req, res) => {
  try {
    await TrainingProgram.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Training Program deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Training Assignment Routes
// =======================

router.get('/assignments', verifyToken, async (req, res) => {
  try {
    const assignments = await TrainingAssignment.find({
      company: req.user.company
    }).populate('employee', 'name empId department').populate('trainingProgram', 'title category mode status startDate endDate trainer trainees');
    res.status(200).json(assignments);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/assignments', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      trainingProgram,
      status,
      completionDate,
      attendanceScore,
      feedback,
      effectivenessScore
    } = req.body;
    const newAssignment = new TrainingAssignment({
      company: req.user.company,
      employee,
      trainingProgram,
      status,
      completionDate,
      attendanceScore,
      feedback,
      effectivenessScore,
      assignedBy: req.user.id
    });
    const savedAssignment = await newAssignment.save();
    res.status(201).json(savedAssignment);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/assignments/:id', verifyToken, async (req, res) => {
  try {
    const updatedAssignment = await TrainingAssignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });
    res.status(200).json(updatedAssignment);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Certification Routes
// =======================

router.get('/certifications', verifyToken, async (req, res) => {
  try {
    const certs = await Certification.find({
      company: req.user.company
    }).populate('employee', 'name empId department');
    res.status(200).json(certs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/certifications', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      name,
      issuingAuthority,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    } = req.body;
    const newCert = new Certification({
      company: req.user.company,
      employee,
      name,
      issuingAuthority,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    });
    const savedCert = await newCert.save();
    res.status(201).json(savedCert);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Skill Gap Routes
// =======================

router.get('/skills', verifyToken, async (req, res) => {
  try {
    const skills = await EmployeeSkill.find({
      company: req.user.company
    }).populate('employee', 'name empId department');
    res.status(200).json(skills);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/skills', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      skillName,
      proficiencyLevel,
      gapIdentified,
      gapDescription
    } = req.body;
    const newSkill = new EmployeeSkill({
      company: req.user.company,
      employee,
      skillName,
      proficiencyLevel,
      gapIdentified,
      gapDescription
    });
    const savedSkill = await newSkill.save();
    res.status(201).json(savedSkill);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Training Feedback Routes (C7)
// =======================

// In-memory schema stored inline using TrainingProgram feedback field (stored in separate collection)
const mongoose = require('mongoose');
const TrainingFeedbackSchema = new mongoose.Schema({
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  comments: {
    type: String
  },
  wouldRecommend: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});
const TrainingFeedback = mongoose.models.TrainingFeedback || mongoose.model('TrainingFeedback', TrainingFeedbackSchema);

// POST /api/training/:programId/feedback
router.post('/:programId/feedback', verifyToken, async (req, res) => {
  try {
    const {
      employee,
      rating,
      comments,
      wouldRecommend
    } = req.body;
    const feedback = new TrainingFeedback({
      program: req.params.programId,
      employee,
      rating,
      comments,
      wouldRecommend
    });
    const saved = await feedback.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET /api/training/:programId/feedback
router.get('/:programId/feedback', verifyToken, async (req, res) => {
  try {
    const feedbacks = await TrainingFeedback.find({
      company: req.user.company,
      program: req.params.programId
    }).populate('employee', 'name empId department').sort({
      createdAt: -1
    });
    const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1) : 0;
    res.status(200).json({
      feedbacks,
      avgRating,
      count: feedbacks.length
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Training Certificate Routes (C7)
// =======================

// POST /api/training/:programId/certificate/:employeeId — issue certificate
router.post('/:programId/certificate/:employeeId', verifyToken, async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.programId);
    if (!program) return res.status(404).json({
      message: "Training program not found."
    });

    // Check if already issued
    const existing = await Certification.findOne({
      company: req.user.company,
      employee: req.params.employeeId,
      credentialId: `TRAIN-${req.params.programId}`
    });
    if (existing) return res.status(200).json(existing);
    const cert = new Certification({
      company: req.user.company,
      employee: req.params.employeeId,
      name: `${program.title} - Completion Certificate`,
      issuingAuthority: program.trainer || 'HRMS Training Department',
      issueDate: new Date(),
      credentialId: `TRAIN-${req.params.programId}`,
      credentialUrl: ''
    });
    const saved = await cert.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET /api/training/certificates/employee/:empId
router.get('/certificates/employee/:empId', verifyToken, async (req, res) => {
  try {
    const certs = await Certification.find({
      company: req.user.company,
      employee: req.params.empId
    }).populate('employee', 'name empId department').sort({
      issueDate: -1
    });
    res.status(200).json(certs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// =======================
// Trainee & Trainee Attendance Routes
// =======================

const TraineeAttendance = require('../models/TraineeAttendance');
const Admin = require('../models/Admin');

// GET: company info for certificates
router.get('/company-info', verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.company);
    if (!admin) {
      return res.status(404).json({ message: 'Company admin not found.' });
    }
    res.status(200).json({
      ceoName: admin.name,
      companyName: admin.companyName,
      companyLogo: admin.companyLogo,
      signature: admin.signature
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Add trainee to program
router.post('/programs/:id/trainees', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Training program not found.' });
    }
    
    // Avoid duplicate email
    const exists = program.trainees.some(t => t.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ message: 'Trainee with this email already added.' });
    }

    program.trainees.push({ name, email });
    await program.save();
    res.status(200).json(program);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Get trainees of program
router.get('/programs/:id/trainees', verifyToken, async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Training program not found.' });
    }
    res.status(200).json(program.trainees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Mark daily attendance
router.post('/programs/:id/attendance', verifyToken, async (req, res) => {
  try {
    const { date, attendance } = req.body; // attendance is array: [{ email, status }]
    if (!date || !attendance || !Array.isArray(attendance)) {
      return res.status(400).json({ message: 'date and attendance array are required.' });
    }

    const savedRecords = [];
    for (const item of attendance) {
      const record = await TraineeAttendance.findOneAndUpdate(
        {
          company: req.user.company,
          trainingProgram: req.params.id,
          traineeEmail: item.email,
          date: date
        },
        {
          status: item.status
        },
        {
          upsert: true,
          new: true
        }
      );
      savedRecords.push(record);
    }
    res.status(200).json(savedRecords);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Get daily attendance of program
router.get('/programs/:id/attendance', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {
      company: req.user.company,
      trainingProgram: req.params.id
    };
    if (date) {
      filter.date = date;
    }
    const logs = await TraineeAttendance.find(filter);
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET: Get all trainee attendance records for the company (HR overview)
router.get('/all-trainee-attendance', verifyToken, async (req, res) => {
  try {
    const logs = await TraineeAttendance.find({
      company: req.user.company
    }).populate('trainingProgram', 'title trainer startDate endDate trainees');
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Generate certificates for all trainees of a program
router.post('/programs/:id/generate-certificates', verifyToken, async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ message: 'Training program not found.' });
    }

    const recipients = [];

    // Add manual trainees
    if (program.trainees && program.trainees.length > 0) {
      program.trainees.forEach(t => {
        recipients.push({
          name: t.name,
          email: t.email,
          employeeId: null
        });
      });
    }

    // Add assigned employees
    const assignments = await TrainingAssignment.find({
      trainingProgram: req.params.id,
      company: req.user.company
    }).populate('employee', 'name email');

    assignments.forEach(a => {
      if (a.employee) {
        recipients.push({
          name: a.employee.name,
          email: a.employee.email,
          employeeId: a.employee._id
        });
      }
    });

    if (recipients.length === 0) {
      return res.status(400).json({ message: 'No trainees or enrolled employees found in this training program.' });
    }

    const durationStr = `From ${program.startDate ? new Date(program.startDate).toLocaleDateString() : 'N/A'} to ${program.endDate ? new Date(program.endDate).toLocaleDateString() : 'N/A'}`;
    const issuedCerts = [];

    for (const recipient of recipients) {
      // Check if already issued
      const credentialId = `TRAIN-${program._id}-${recipient.email.replace(/[@.]/g, '-')}`;
      let cert = await Certification.findOne({
        company: req.user.company,
        traineeEmail: recipient.email,
        credentialId: credentialId
      });

      if (!cert) {
        cert = new Certification({
          company: req.user.company,
          employee: recipient.employeeId || undefined,
          traineeName: recipient.name,
          traineeEmail: recipient.email,
          name: `${program.title} - Completion Certificate`,
          issuingAuthority: program.trainer || 'HRMS Training Department',
          issueDate: new Date(),
          duration: durationStr,
          credentialId: credentialId,
          credentialUrl: ''
        });
        await cert.save();
      }
      issuedCerts.push(cert);
    }

    res.status(201).json({ message: 'Certificates generated successfully.', certifications: issuedCerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE: Delete a training assignment
router.delete('/assignments/:id', verifyToken, async (req, res) => {
  try {
    await TrainingAssignment.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Upload certificates in bulk
router.post('/certifications/bulk', verifyToken, async (req, res) => {
  try {
    const { certifications } = req.body;
    if (!certifications || !Array.isArray(certifications)) {
      return res.status(400).json({ message: 'Certifications array is required.' });
    }
    
    const savedCerts = [];
    for (const certData of certifications) {
      const credentialId = certData.credentialId || `BULK-${Math.random().toString(36).substr(2, 9)}`;
      const newCert = new Certification({
        company: req.user.company,
        traineeName: certData.traineeName,
        traineeEmail: certData.traineeEmail,
        name: certData.name,
        issuingAuthority: certData.issuingAuthority || 'HRMS Certification System',
        issueDate: certData.issueDate ? new Date(certData.issueDate) : new Date(),
        expiryDate: certData.expiryDate ? new Date(certData.expiryDate) : undefined,
        duration: certData.duration,
        credentialId: credentialId,
        credentialUrl: certData.credentialUrl || ''
      });
      const saved = await newCert.save();
      savedCerts.push(saved);
    }
    res.status(201).json({ message: `${savedCerts.length} certifications uploaded successfully.`, certifications: savedCerts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST: Save admin signature
router.post('/save-signature', verifyToken, async (req, res) => {
  try {
    const { signature } = req.body;
    if (!signature) {
      return res.status(400).json({ message: 'Signature is required.' });
    }
    
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.company,
      { signature },
      { new: true }
    );
    if (!updatedAdmin) {
      return res.status(404).json({ message: 'Company admin not found.' });
    }
    
    res.status(200).json({ message: 'Signature saved successfully.', signature: updatedAdmin.signature });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;