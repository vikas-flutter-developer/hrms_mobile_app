const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const CompanyDocument = require('../models/CompanyDocument');
const EmployeeDocument = require('../models/EmployeeDocument');
const Employee = require('../models/Employee');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

// =======================
// Company Document Routes
// =======================

router.get('/company', verifyToken, async (req, res) => {
  try {
    const docs = await CompanyDocument.find({
      company: req.user.company
    }).populate('uploadedBy', 'name');
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.post('/company', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      fileUrl,
      fileName,
      accessControl,
      version
    } = req.body;
    const newDoc = new CompanyDocument({
      company: req.user.company,
      title,
      description,
      category,
      fileUrl,
      fileName,
      accessControl,
      version,
      uploadedBy: req.user.id
    });
    const savedDoc = await newDoc.save();
    res.status(201).json(savedDoc);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/company/:id', verifyToken, async (req, res) => {
  try {
    await CompanyDocument.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// ====================================
// Employee Document Routes (E3 + E4)
// ====================================

/**
 * GET /api/documents/employee
 * E3: Role-based access filtering
 *   - admin  → all documents
 *   - hr     → all except 'Admin Only'
 *   - employee → only their own 'Public' docs
 */
router.get('/employee', verifyToken, async (req, res) => {
  try {
    const {
      role,
      id: userId
    } = req.user;
    let query = {};
    if (role === 'admin') {
      // Admin sees everything
      query = {};
    } else if (role === 'hr') {
      // HR sees Public + HR Only (not Admin Only)
      query = {
        accessLevel: {
          $in: ['Public', 'HR Only']
        }
      };
    } else {
      // Employee sees only their own Public documents
      // Find the employee record by user id
      const emp = await Employee.findById(userId);
      if (!emp) return res.status(404).json({
        message: 'Employee not found'
      });
      query = {
        employeeId: emp._id,
        accessLevel: 'Public'
      };
    }
    const docs = await EmployeeDocument.find({
      ...query,
      company: req.user.company
    }).populate('employeeId', 'name empId department');
    res.status(200).json(docs);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

/**
 * POST /api/documents/employee
 * E3: Accept accessLevel field
 * E4: Version control — if same employee + type already exists, push new version
 */
router.post('/employee', verifyToken, async (req, res) => {
  try {
    const {
      employeeId,
      title,
      type,
      fileUrl,
      fileName,
      expiryDate,
      status,
      accessLevel,
      notes
    } = req.body;

    // E4: Check for existing document (same employee + same docType)
    const existing = await EmployeeDocument.findOne({
      company: req.user.company,
      employeeId,
      type
    });
    if (existing) {
      // Push current version to history before updating
      const nextVersion = (existing.versions || []).length + 2; // +1 for the current active becoming v_prev, +1 for new
      const prevVersionNum = nextVersion - 1;

      // Record previous version in history
      existing.versions.push({
        version: prevVersionNum - 1 || 1,
        filePath: existing.fileUrl,
        fileName: existing.fileName,
        uploadedAt: existing.updatedAt || existing.createdAt,
        uploadedBy: existing.uploadedBy,
        notes: 'Previous version'
      });

      // Update document to new version
      existing.title = title || existing.title;
      existing.fileUrl = fileUrl;
      existing.fileName = fileName;
      existing.uploadedBy = req.user.id;
      if (expiryDate !== undefined) existing.expiryDate = expiryDate;
      if (status !== undefined) existing.status = status;
      if (accessLevel !== undefined) existing.accessLevel = accessLevel;
      const savedDoc = await existing.save();
      return res.status(200).json({
        ...savedDoc.toObject(),
        _versionUpdated: true
      });
    }

    // New document — create with empty versions array
    const newDoc = new EmployeeDocument({
      company: req.user.company,
      employeeId,
      title,
      type,
      fileUrl,
      fileName,
      expiryDate,
      status,
      accessLevel: accessLevel || 'HR Only',
      uploadedBy: req.user.id,
      versions: []
    });
    const savedDoc = await newDoc.save();
    res.status(201).json(savedDoc);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.put('/employee/:id/status', verifyToken, async (req, res) => {
  try {
    const updatedDoc = await EmployeeDocument.findByIdAndUpdate(req.params.id, {
      status: req.body.status
    }, {
      new: true
    });
    res.status(200).json(updatedDoc);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});
router.delete('/employee/:id', verifyToken, async (req, res) => {
  try {
    await EmployeeDocument.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: 'Document deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// E4: GET version history for a document
router.get('/employee/:id/versions', verifyToken, async (req, res) => {
  try {
    const doc = await EmployeeDocument.findById(req.params.id).populate('versions.uploadedBy', 'name empId');
    if (!doc) return res.status(404).json({
      message: 'Document not found'
    });

    // Build version list: all stored versions + current as latest
    const history = [...(doc.versions || [])];

    // Append current as the "latest version" entry
    history.push({
      version: history.length + 1,
      filePath: doc.fileUrl,
      fileName: doc.fileName,
      uploadedAt: doc.updatedAt,
      uploadedBy: doc.uploadedBy,
      notes: 'Current version (latest)',
      _isCurrent: true
    });

    // Reverse so latest is first
    history.reverse();
    res.status(200).json({
      documentId: doc._id,
      title: doc.title,
      versions: history
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// BULK DOWNLOAD EMPLOYEE DOCUMENTS
router.get('/employee/:id/bulk-download', verifyToken, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({
      message: 'Employee not found'
    });
    const docs = await EmployeeDocument.find({
      company: req.user.company,
      employeeId: req.params.id
    });
    if (!docs.length) return res.status(404).json({
      message: 'No documents found for this employee'
    });
    const zip = new AdmZip();
    for (const doc of docs) {
      let localPath = doc.fileUrl;
      if (localPath.includes('/uploads/')) {
        localPath = path.join(__dirname, '..', 'uploads', localPath.split('/uploads/').pop());
      } else {
        localPath = path.join(__dirname, '..', 'uploads', localPath);
      }
      if (fs.existsSync(localPath)) {
        zip.addLocalFile(localPath);
      } else {
        zip.addFile(`${doc.fileName}.txt`, Buffer.from(`External or missing file: ${doc.fileUrl}`, 'utf8'));
      }
    }
    const zipBuffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=${employee.name.replace(/\s+/g, '_')}_Documents.zip`);
    res.send(zipBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;