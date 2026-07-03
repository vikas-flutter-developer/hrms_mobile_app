const express = require('express');
const router = express.Router();
const SecurityLog = require('../models/SecurityLog');
const UserSession = require('../models/UserSession');
const IpRule = require('../models/IpRule');
const verifyToken = require('../middleware/auth');
const checkSuperAdminRole = require('../middleware/superAdminRbac');

const ownerSupportAnalyticsProtector = checkSuperAdminRole(['Owner', 'Support', 'Analytics']);
const ownerSupportProtector = checkSuperAdminRole(['Owner', 'Support']);
const ownerProtector = checkSuperAdminRole(['Owner']);

// ==========================================
// 📜 AUDIT TRAIL & LOGS STREAM (With Dynamic Filters)
// ==========================================
router.get('/logs', verifyToken, ownerSupportAnalyticsProtector, async (req, res) => {
  try {
    const {
      category,
      userRole,
      companyName
    } = req.query;
    let queryFilter = {};

    // Dynamic Filtering Core
    if (category) queryFilter.category = category;
    if (userRole) queryFilter.userRole = userRole;
    if (companyName) queryFilter.companyName = companyName;
    const logs = await SecurityLog.find(queryFilter).sort({
      createdAt: -1
    });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({
      message: "Failed to pull security logs",
      error: err.message
    });
  }
});

// ==========================================
// 👥 LIVE SESSIONS & FORCE LOGOUT ENGINE
// ==========================================

// Get All Live Sessions
router.get('/sessions', verifyToken, ownerSupportProtector, async (req, res) => {
  try {
    const activeSessions = await UserSession.find({
      isActive: true
    }).sort({
      updatedAt: -1
    });
    res.status(200).json(activeSessions);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Force Terminate Any Active Session (Force Logout)
router.delete('/sessions/:id', verifyToken, ownerSupportProtector, async (req, res) => {
  try {
    await UserSession.findByIdAndDelete(req.params.id);

    // Push this termination inside audit logs trail
    await SecurityLog.create({
      userEmail: req.user ? req.user.email || 'System/Admin' : 'System/Admin',
      userRole: req.user ? req.user.role || 'SuperAdmin' : 'SuperAdmin',
      companyName: 'SuperAdmin Control',
      category: 'ADMIN_ACTION',
      details: `Forced manual session termination for instance ID: ${req.params.id}`,
      severity: 'Warning',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      deviceInfo: req.headers['user-agent'] || 'Browser Client',
      originFile: 'backend/routes/securityRoutes.js',
      originLine: '57',
      apiRoute: 'DELETE /api/security/sessions/:id',
      mitigationSteps: 'Verify admin identity and confirm the session termination was authorized.'
    });
    res.status(200).json({
      message: "Session forcefully terminated inside matrix"
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ==========================================
// 🛡️ IP FIREWALL MANAGEMENT (Whitelist / Blacklist)
// ==========================================

// Fetch Rules
router.get('/ip-rules', verifyToken, ownerProtector, async (req, res) => {
  try {
    const rules = await IpRule.find().sort({
      createdAt: -1
    });
    res.status(200).json(rules);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Add New IP Rule Constraints
router.post('/ip-rules', verifyToken, ownerProtector, async (req, res) => {
  try {
    const {
      ipAddress,
      ruleType,
      reason
    } = req.body;
    const newRule = new IpRule({
      ipAddress,
      ruleType,
      reason
    });
    await newRule.save();

    // Audit Trail entry
    await SecurityLog.create({
      userEmail: req.user ? req.user.email || 'System/Admin' : 'System/Admin',
      userRole: req.user ? req.user.role || 'SuperAdmin' : 'SuperAdmin',
      companyName: 'SuperAdmin Control',
      category: 'IP_RULE_CHANGE',
      details: `Configured ${ruleType} rule policy for network node: ${ipAddress} (Reason: ${reason})`,
      severity: 'Info',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      deviceInfo: req.headers['user-agent'] || 'Browser Client',
      originFile: 'backend/routes/securityRoutes.js',
      originLine: '96',
      apiRoute: 'POST /api/security/ip-rules',
      mitigationSteps: 'Verify if the firewall IP rule change matches the authorized security policy.'
    });
    res.status(201).json({
      message: "IP policy committed successfully",
      rule: newRule
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Remove Rule Constraint
router.delete('/ip-rules/:id', verifyToken, ownerProtector, async (req, res) => {
  try {
    await IpRule.findByIdAndDelete(req.params.id);
    res.status(200).json({
      message: "IP rule context flushed."
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ==========================================
// 📱 DEVICE MANAGEMENT (Trusted Devices)
// ==========================================

router.get('/devices', verifyToken, ownerProtector, async (req, res) => {
  try {
    const TrustedDevice = require('../models/TrustedDevice');
    const devices = await TrustedDevice.find().sort({ lastSeen: -1 });
    res.status(200).json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/devices/:id/status', verifyToken, ownerProtector, async (req, res) => {
  try {
    const TrustedDevice = require('../models/TrustedDevice');
    const { status } = req.body;
    const device = await TrustedDevice.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    await SecurityLog.create({
      userEmail: req.user ? req.user.email || 'System/Admin' : 'System/Admin',
      userRole: req.user ? req.user.role || 'SuperAdmin' : 'SuperAdmin',
      companyName: 'SuperAdmin Control',
      category: 'ADMIN_ACTION',
      details: `Updated trust status to ${status} for device ${device.deviceInfo} (${device.ipAddress})`,
      severity: 'Info',
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      deviceInfo: req.headers['user-agent'] || 'Browser Client',
      originFile: 'backend/routes/securityRoutes.js',
      originLine: '178',
      apiRoute: 'PUT /api/security/devices/:id/status',
      mitigationSteps: 'Routine device trust management.'
    });

    res.status(200).json({ message: "Device status updated", device });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🚨 REAL TELEMETRY INGESTION GATEWAY (Formerly Mock Trigger)
// ==========================================
router.post('/trigger-mock-event', verifyToken, async (req, res) => {
  try {
    const { category, details, severity, originFile, originLine, apiRoute, mitigationSteps } = req.body;
    
    let userEmail = 'System/Guest';
    let userRole = 'Guest';
    let companyName = 'Global HQ';

    if (req.user) {
      userRole = req.user.role || 'Guest';
      const actorId = req.user.id;

      if (userRole.toLowerCase() === 'superadmin') {
        const Superadmin = require('../models/Superadmin');
        const sa = await Superadmin.findById(actorId);
        if (sa) {
          userEmail = sa.email;
          companyName = 'SuperAdmin Control';
        }
      } else if (userRole.toLowerCase() === 'admin') {
        const Admin = require('../models/Admin');
        const admin = await Admin.findById(actorId);
        if (admin) {
          userEmail = admin.email;
          companyName = admin.companyName || 'Tenant Admin';
        }
      } else {
        const Employee = require('../models/Employee');
        const emp = await Employee.findById(actorId).populate('company');
        if (emp) {
          userEmail = emp.email;
          if (emp.company) {
            companyName = emp.company.companyName || 'Employee Tenant';
          }
        }
      }
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const deviceInfo = req.headers['user-agent'] || 'Browser Client';

    const log = await SecurityLog.create({
      userEmail,
      userRole,
      companyName,
      category,
      details,
      severity,
      ipAddress,
      deviceInfo,
      originFile: originFile || 'backend/routes/securityRoutes.js',
      originLine: originLine || '151',
      apiRoute: apiRoute || 'POST /api/security/trigger-mock-event',
      mitigationSteps: mitigationSteps || (severity === 'Critical' || severity === 'Warning' 
        ? `1. Cross-reference IP ${ipAddress} with known threats.\n2. Add IP to firewall block list.\n3. Reset credentials for ${userEmail} if compromise is suspected.`
        : 'Informational compliance event. No immediate action required.')
    });

    // Auto-record device
    const TrustedDevice = require('../models/TrustedDevice');
    await TrustedDevice.findOneAndUpdate(
      { userEmail, deviceInfo, ipAddress },
      { $set: { lastSeen: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Security Breach Notifications
    if (severity === 'Critical') {
      try {
        const Notification = require('../models/Notification');
        const Superadmin = require('../models/Superadmin');
        const superadmins = await Superadmin.find();
        
        const notifications = superadmins.map(sa => ({
          recipientId: sa._id,
          recipientModel: 'SuperAdmin',
          title: `🚨 Security Breach Detected`,
          message: `CRITICAL: ${category} detected from ${userEmail} (${ipAddress}). Details: ${details.substring(0, 100)}`
        }));
        
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
        }
      } catch (notifErr) {
        console.error("Failed to push breach notification:", notifErr);
      }
    }

    res.status(201).json({
      message: "Telemetry event registered successfully",
      log
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
module.exports = router;