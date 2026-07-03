const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Import centralized database module models
const Superadmin = require('../models/Superadmin');
const Admin = require('../models/Admin');
const Notification = require('../models/Notification');
const Coupon = require('../models/Coupon');
const Employee = require('../models/Employee');
const { seedGlobalMasterDataToCompany } = require('../utils/masterDataSeeder');

// Import separated secure gatekeeper verification middleware
const verifyToken = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || "HRMS_SUPER_SECRET_KEY@_123";

const addMonthsToDate = (baseDate, months) => {
  const result = new Date(baseDate);
  result.setMonth(result.getMonth() + months);
  return result;
};

const getPlanDurationMonths = (planName) => {
  const normalized = (planName || '').toString().trim().toLowerCase();
  if (normalized.includes('6 month')) return 6;
  if (normalized.includes('3 month')) return 3;
  if (normalized.includes('1 month')) return 1;
  if (normalized === 'enterprise') return 12;
  return 1;
};

// ==========================================
// 🚀 AUTOMATED SUPERADMIN SEED ENGINE
// ==========================================
(async () => {
  try {
    const rootExist = await Superadmin.findOne({ email: "ceo@company.com" });
    if (!rootExist) {
      const salt = await bcrypt.genSalt(10);
      const standardHashedPassword = await bcrypt.hash("supersecretpassword", salt);
      const defaultRoot = new Superadmin({
        name: "Global CEO Root",
        email: "ceo@company.com",
        password: standardHashedPassword
      });
      await defaultRoot.save();
      console.log("📍 [System Seed]: Superadmin credentials verified.");
    }
  } catch (err) {
    console.error("System Seeder failed:", err.message);
  }
})();

// ==========================================
// 🚀 SECURE ADMINISTRATIVE INITIAL SIGNUP
// ==========================================
router.post('/register-admin', async (req, res) => {
  const {
    adminId, name, email, password, companyName,
    companyType, industryType, website, logo,
    companyStartDate, branchLocation, branchLat, branchLng, phone, employeeQuotaTarget,
    selectedPlanName, planPrice, subscriptionExpiry, durationMonths, autoRenew,
    registrationNumber, tanId, panId, gstId,
    // NEW OPTIONAL FIELDS
    financialYear, workingDays, workingHours, timeZone,
    currency, dateFormat, language, socialLinks, branches, smtpSettings,
    companySizeRange
  } = req.body;

  if (!email || !password || !companyName || !name || !phone || !registrationNumber || !tanId || !panId || !gstId) {
    return res.status(400).json({ message: "Parameters missing: All corporate details and verified compliance fields (Reg No/TAN/PAN/GST) are required." });
  }

  try {
    const existingAdmin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: "An administrator account with this email already exists." });
    }

    const { validatePasswordPolicy } = require('../utils/passwordPolicy');
    await validatePasswordPolicy(password.trim());

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    const newAdmin = new Admin({
      adminId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      companyName: companyName.trim(),
      companyType: companyType || "Startup",
      industryType: industryType || "IT",
      website: website || "",
      companyLogo: logo || "",
      companyStartDate: companyStartDate ? new Date(companyStartDate) : new Date(),
      branchLocation: branchLocation || "HQ",
      branchLat: branchLat || null,
      branchLng: branchLng || null,
      phone: phone.trim(),
      registrationNumber: registrationNumber.trim().toUpperCase(),
      tanId: tanId.trim().toUpperCase(),
      panId: panId.trim().toUpperCase(),
      gstId: gstId.trim().toUpperCase(),
      companySizeRange: companySizeRange || '1-10',
      employeeQuotaTarget: companySizeRange === '1-10' ? 10 : companySizeRange === '11-50' ? 50 : companySizeRange === '51-200' ? 200 : companySizeRange === '201-500' ? 500 : 1000,
      hasPaidTier: true,
      selectedPlanName: selectedPlanName || 'None',
      planPrice: planPrice || '0',
      subscriptionExpiry: subscriptionExpiry
        ? new Date(subscriptionExpiry)
        : addMonthsToDate(new Date(), Number(durationMonths) || getPlanDurationMonths(selectedPlanName)),
      autoRenew: autoRenew !== undefined ? (autoRenew === true || autoRenew === 'true') : true,

      // OPTIONAL NEW FIELDS WITH FALLBACKS
      financialYear: financialYear || 'Apr-Mar',
      workingDays: workingDays || 'Mon-Fri',
      workingHours: workingHours || '9 AM - 6 PM',
      timeZone: timeZone || 'IST',
      currency: currency || 'INR',
      dateFormat: dateFormat || 'DD/MM/YYYY',
      language: language || 'English',
      socialLinks: socialLinks || { linkedin: '', facebook: '', twitter: '' },
      branches: branches || [],
      smtpSettings: smtpSettings || { host: '', port: 587, user: '', pass: '' },
      status: "Pending Approval" // Awaiting Super Admin approval
    });

    await newAdmin.save();

    // Seed global MasterData templates to this new company
    await seedGlobalMasterDataToCompany(newAdmin._id);

    try {
      const rootAdmins = await Superadmin.find({});
      for (const root of rootAdmins) {
        await Notification.create({
          recipientId: root._id,
          recipientModel: 'Superadmin',
          title: "New Company Approval Needed",
          message: `A new company "${companyName.trim()}" has registered and requires your approval to become active.`,
          link: '/superadmin/Dashboard#approvals'
        });
      }
    } catch (notifErr) {
      console.error("Failed to notify superadmins:", notifErr);
    }

    res.status(201).json({
      message: "Administrative profile ledger instantiated successfully.",
      adminId: newAdmin.adminId
    });

  } catch (err) {
    console.error("Critical error in Admin registration:", err);
    res.status(500).json({ message: "Internal server error instantiating administrative database profile." });
  }
});

// ==========================================
// 🔐 SEPARATED LOGIN CONTROLLER FUNCTION
// ==========================================
async function authenticateUserByPortal(email, password, portalRole) {
  let user = null;
  let resolvedRole = portalRole;

  if (portalRole === 'superadmin') {
    user = await Superadmin.findOne({ email });
    if (!user) {
      const err = new Error(`Access Denied: No account found matching this email under the ${portalRole.toUpperCase()} category.`);
      err.statusCode = 400;
      throw err;
    }
    if (user.status && user.status !== 'Active') {
      const err = new Error(`Access Denied: Your account is currently ${user.status}. Please contact support or wait for approval.`);
      err.statusCode = 403;
      throw err;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error("Invalid credentials: Password verification mismatch.");
      err.statusCode = 400;
      throw err;
    }
  } else if (portalRole === 'admin') {
    user = await Admin.findOne({ email });
    if (!user) {
      const err = new Error(`Access Denied: No account found matching this email under the ${portalRole.toUpperCase()} category.`);
      err.statusCode = 400;
      throw err;
    }
    if (user.status && user.status !== 'Active') {
      const err = new Error(`Access Denied: Your account is currently ${user.status}. Please contact support or wait for approval.`);
      err.statusCode = 403;
      throw err;
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error("Invalid credentials: Password verification mismatch.");
      err.statusCode = 400;
      throw err;
    }
  } else {
    const employees = await Employee.find({ email });
    if (!employees || employees.length === 0) {
      const err = new Error(`Access Denied: No account found matching this email under the ${portalRole.toUpperCase()} category.`);
      err.statusCode = 400;
      throw err;
    }
    for (const emp of employees) {
      const isMatch = await bcrypt.compare(password, emp.password);
      if (isMatch) {
        if (emp.status && emp.status !== 'Active') {
          const err = new Error(`Access Denied: Your account is currently ${emp.status}. Please contact support or wait for approval.`);
          err.statusCode = 403;
          throw err;
        }
        user = emp;
        const actualDbRole = user.role ? user.role.toLowerCase() : "employee";
        resolvedRole = (actualDbRole === 'hr') ? 'hr' : 'employee';
        break;
      }
    }
    if (!user) {
      const err = new Error("Invalid credentials: Password verification mismatch.");
      err.statusCode = 400;
      throw err;
    }
  }

  return { user, resolvedRole };
}

// ==========================================
// 🛣️ STRICT ROUTE HANDLER FOR PORTAL AUTH
// ==========================================
router.post('/login', async (req, res) => {
  const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
  const password = req.body.password ? req.body.password.trim() : "";
  const role = req.body.role ? req.body.role.trim().toLowerCase() : "";

  if (!email || !password || !role) {
    return res.status(400).json({ message: "Parameters missing: email, password, and role are required." });
  }

  try {
    const { user, resolvedRole } = await authenticateUserByPortal(email, password, role);

    // Fetch SystemSetting
    const SystemSetting = require('../models/SystemSetting');
    const systemSettings = await SystemSetting.findOne();

    // 1. IP Whitelisting Check
    if (systemSettings && systemSettings.enableIpWhitelisting) {
      let companyAdmin = null;
      if (resolvedRole === 'admin') {
        companyAdmin = user;
      } else if (resolvedRole === 'employee' || resolvedRole === 'hr') {
        companyAdmin = await Admin.findById(user.company);
      }

      if (companyAdmin && companyAdmin.ipWhitelist && companyAdmin.ipWhitelist.trim() !== '') {
        const allowedIps = companyAdmin.ipWhitelist.split(',').map(ip => ip.trim());
        const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
        
        // Clean IPv6 prefix like ::ffff:
        const cleanClientIp = clientIp.replace(/^.*:/, '');

        const isAllowed = allowedIps.some(allowedIp => {
          if (allowedIp === cleanClientIp || allowedIp === clientIp) return true;
          if (allowedIp.endsWith('*')) {
            const prefix = allowedIp.slice(0, -1);
            return clientIp.startsWith(prefix) || cleanClientIp.startsWith(prefix);
          }
          return false;
        });

        if (!isAllowed) {
          const err = new Error(`Access Denied: Your IP address (${clientIp}) is not whitelisted for this company workspace.`);
          err.statusCode = 403;
          throw err;
        }
      }
    }

    // 1.5 Time-Based Access Check (Role Management)
    if (resolvedRole === 'employee' || resolvedRole === 'hr') {
      const Role = require('../models/Role');
      const roleDoc = await Role.findOne({ 
        roleName: { $regex: new RegExp(`^${user.role}$`, 'i') }, 
        companyId: user.company 
      });

      if (roleDoc && roleDoc.timeBasedAccess && roleDoc.timeBasedAccess.isRestricted) {
        const options = { hour: '2-digit', minute: '2-digit', hour12: false };
        if (companyAdmin && companyAdmin.timeZone) {
           try {
               new Intl.DateTimeFormat('en-GB', { timeZone: companyAdmin.timeZone });
               options.timeZone = companyAdmin.timeZone;
           } catch (e) {
               // Ignore invalid timezone
           }
        }
        const currTimeStr = new Date().toLocaleTimeString('en-GB', options);
        const startTime = roleDoc.timeBasedAccess.startTime || "00:00";
        const endTime = roleDoc.timeBasedAccess.endTime || "23:59";

        if (currTimeStr < startTime || currTimeStr > endTime) {
          const err = new Error(`Access Denied: Your role is restricted to access the platform only between ${startTime} and ${endTime}.`);
          err.statusCode = 403;
          throw err;
        }
      }
    }

    // 2. 2FA Check
    let is2FAEnforced = false;
    if (systemSettings && systemSettings.enable2FA) {
      const enforce2FA = systemSettings.enforce2FA || 'Admin Only';
      if (enforce2FA === 'Enforced for All Users') {
        is2FAEnforced = true;
      } else if (enforce2FA === 'Admin + HR Roles' && (resolvedRole === 'admin' || resolvedRole === 'hr')) {
        is2FAEnforced = true;
      } else if (enforce2FA === 'Admin Only' && resolvedRole === 'admin') {
        is2FAEnforced = true;
      }
    }

    if (is2FAEnforced) {
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      
      const tempToken = jwt.sign(
        { id: user._id, role: resolvedRole, isTemp2FA: true, otpHash: hashedOtp },
        JWT_SECRET,
        { expiresIn: '10m' }
      );

      // Resolve SMTP settings dynamically to send email
      let smtpConfig = null;
      if (resolvedRole === 'admin' && user.smtpSettings && user.smtpSettings.host) {
        smtpConfig = {
          host: user.smtpSettings.host,
          port: user.smtpSettings.port || 587,
          secure: user.smtpSettings.port === 465,
          auth: {
            user: user.smtpSettings.user,
            pass: user.smtpSettings.pass
          }
        };
      } else if ((resolvedRole === 'employee' || resolvedRole === 'hr') && user.company) {
        const parentAdmin = await Admin.findById(user.company);
        if (parentAdmin && parentAdmin.smtpSettings && parentAdmin.smtpSettings.host) {
          smtpConfig = {
            host: parentAdmin.smtpSettings.host,
            port: parentAdmin.smtpSettings.port || 587,
            secure: parentAdmin.smtpSettings.port === 465,
            auth: {
              user: parentAdmin.smtpSettings.user,
              pass: parentAdmin.smtpSettings.pass
            }
          };
        }
      }

      if (!smtpConfig) {
        if (systemSettings && systemSettings.smtpSettings && systemSettings.smtpSettings.host) {
          smtpConfig = {
            host: systemSettings.smtpSettings.host,
            port: systemSettings.smtpSettings.port || 587,
            secure: systemSettings.smtpSettings.port === 465,
            auth: {
              user: systemSettings.smtpSettings.user,
              pass: systemSettings.smtpSettings.password
            }
          };
        }
      }

      let emailSent = false;
      if (smtpConfig && smtpConfig.host && smtpConfig.auth.user) {
        try {
          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: smtpConfig.secure,
            auth: {
              user: smtpConfig.auth.user,
              pass: smtpConfig.auth.pass
            },
            tls: {
              rejectUnauthorized: false
            }
          });

          const mailOptions = {
            from: smtpConfig.auth.user,
            to: user.email,
            subject: 'HRMS Portal 2FA Verification Code',
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px;">
                <h2 style="color: #be123c; text-align: center;">HRMS 2FA Verification</h2>
                <hr style="border: none; border-top: 1px solid #eee;" />
                <p>Hello ${user.name},</p>
                <p>To complete your login, please verify your identity using the following 4-digit code:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #fff1f2; color: #be123c; padding: 10px 20px; border-radius: 8px; border: 1px dashed #f43f5e;">
                    ${otp}
                  </span>
                </div>
                <p>This code is valid for 10 minutes. If you did not log in, please secure your account credentials immediately.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
                <p style="font-size: 11px; color: #999; text-align: center;">This is an automated system security email. Please do not reply directly.</p>
              </div>
            `
          };

          await transporter.sendMail(mailOptions);
          emailSent = true;
        } catch (mailErr) {
          console.error("Nodemailer 2FA dispatch failed:", mailErr);
        }
      }

      return res.status(200).json({
        twoFactorRequired: true,
        tempToken,
        otpSimulation: emailSent ? undefined : otp,
        message: emailSent ? "2FA verification code dispatched to email." : "2FA OTP code generated (Simulated)."
      });
    }

    // Write login success to SecurityLog
    const SecurityLog = require('../models/SecurityLog');
    try {
      await SecurityLog.create({
        userEmail: user.email,
        userRole: resolvedRole.toUpperCase(),
        companyName: resolvedRole === 'admin' ? user.companyName : (resolvedRole === 'superadmin' ? 'SuperAdmin Control' : 'Tenant Employee'),
        category: 'LOGIN_SUCCESS',
        details: `Successfully logged into portal via ${role.toUpperCase()} gateway.`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        deviceInfo: req.headers['user-agent'] || 'Browser Client',
        severity: 'Info',
        originFile: 'backend/routes/auth.js',
        originLine: '350',
        apiRoute: 'POST /api/auth/login'
      });
    } catch (logErr) {
      console.error("Failed to write login success log:", logErr);
    }

    // 🏢 MULTI-TENANCY: embed company scope in token
    // Admin → company = their own _id
    // Employee/HR → company = the Admin who created them
    const companyId = resolvedRole === 'admin' ? user._id : (user.company || null);

    const positionLevel = (resolvedRole === 'employee' || resolvedRole === 'hr') ? (user.positionLevel || 'Team Member') : null;
    const tokenExpiry = systemSettings && systemSettings.sessionTimeoutMinutes ? systemSettings.sessionTimeoutMinutes + 'm' : '1d';
    
    const token = jwt.sign(
      { id: user._id, role: resolvedRole, company: companyId, positionLevel },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: resolvedRole,
      positionLevel: (resolvedRole === 'employee' || resolvedRole === 'hr') ? (user.positionLevel || 'Team Member') : null,
      name: user.name,
      email: user.email
    });

  } catch (err) {
    const SecurityLog = require('../models/SecurityLog');
    try {
      await SecurityLog.create({
        userEmail: email || 'unknown@example.com',
        userRole: role ? role.toUpperCase() : 'UNKNOWN',
        companyName: 'Attempted Login',
        category: 'LOGIN_FAILED',
        details: `Failed login attempt. Reason: ${err.message}`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        deviceInfo: req.headers['user-agent'] || 'Browser Client',
        severity: 'Warning',
        originFile: 'backend/routes/auth.js',
        originLine: '280',
        apiRoute: 'POST /api/auth/login'
      });
    } catch (logErr) {}

    const status = err.statusCode || 500;
    const message = status === 500 ? "Server error during authentication processing loop." : err.message;
    if (status === 500) console.error("Server Login Exception Fault:", err);
    res.status(status).json({ message });
  }
});

router.post('/verify-2fa', async (req, res) => {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp) {
    return res.status(400).json({ message: "Parameters missing: tempToken and otp are required." });
  }

  try {
    const decoded = jwt.verify(tempToken, JWT_SECRET);
    if (!decoded.isTemp2FA) {
      return res.status(400).json({ message: "Invalid verification token scope." });
    }

    const isMatch = await bcrypt.compare(otp, decoded.otpHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid 2FA verification code." });
    }

    const userId = decoded.id;
    const resolvedRole = decoded.role;
    let user = null;

    if (resolvedRole === 'superadmin') {
      user = await Superadmin.findById(userId);
    } else if (resolvedRole === 'admin') {
      user = await Admin.findById(userId);
    } else {
      user = await Employee.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    if (user.status && user.status !== 'Active') {
      return res.status(403).json({ message: `Access Denied: Your account is currently ${user.status}.` });
    }

    // Write login success to SecurityLog
    const SecurityLog = require('../models/SecurityLog');
    try {
      await SecurityLog.create({
        userEmail: user.email,
        userRole: resolvedRole.toUpperCase(),
        companyName: resolvedRole === 'admin' ? user.companyName : (resolvedRole === 'superadmin' ? 'SuperAdmin Control' : 'Tenant Employee'),
        category: 'LOGIN_SUCCESS',
        details: `Successfully completed 2FA verification and logged into portal.`,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        deviceInfo: req.headers['user-agent'] || 'Browser Client',
        severity: 'Info',
        originFile: 'backend/routes/auth.js',
        originLine: 'verify-2fa',
        apiRoute: 'POST /api/auth/verify-2fa'
      });
    } catch (logErr) {
      console.error("Failed to write login success log:", logErr);
    }

    const companyId = resolvedRole === 'admin' ? user._id : (user.company || null);
    const positionLevel = (resolvedRole === 'employee' || resolvedRole === 'hr') ? (user.positionLevel || 'Team Member') : null;

    const SystemSetting = require('../models/SystemSetting');
    const systemSettings = await SystemSetting.findOne();
    const tokenExpiry = systemSettings && systemSettings.sessionTimeoutMinutes ? systemSettings.sessionTimeoutMinutes + 'm' : '1d';

    const token = jwt.sign(
      { id: user._id, role: resolvedRole, company: companyId, positionLevel },
      JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: resolvedRole,
      positionLevel,
      name: user.name,
      email: user.email
    });

  } catch (err) {
    console.error("2FA Verification Error:", err);
    res.status(401).json({ message: "Verification failed or code expired." });
  }
});

// ==========================================
// 👤 PROFILE LAYER RECOVERY STORAGE CHANNELS
// ==========================================
router.get('/admin-profile', verifyToken, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) return res.status(404).json({ message: "Profile record not found." });
    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/admin-profile', verifyToken, async (req, res) => {
  const {
    name, companyName, companyType, industryType, website,
    branchLocation, branchLat, branchLng, phone, panId, gstId,
    registrationNumber, tanId, companySizeRange,
    financialYear, workingDays, workingHours,
    timeZone, currency, dateFormat, language,
    socialLinks, branches, smtpSettings, signature
  } = req.body;

  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name,
          companyName,
          companyType,
          industryType,
          website,
          branchLocation,
          branchLat,
          branchLng,
          phone,
          panId: panId ? panId.trim().toUpperCase() : "",
          gstId: gstId ? gstId.trim().toUpperCase() : "",
          registrationNumber,
          tanId: tanId ? tanId.trim().toUpperCase() : "",
          companySizeRange,
          employeeQuotaTarget: companySizeRange === '1-10' ? 10 : companySizeRange === '11-50' ? 50 : companySizeRange === '51-200' ? 200 : companySizeRange === '201-500' ? 500 : 1000,
          financialYear,
          workingDays,
          workingHours,
          timeZone,
          currency,
          dateFormat,
          language,
          socialLinks,
          branches,
          smtpSettings,
          signature
        }
      },
      { returnDocument: 'after', runValidators: true } // ✅ Modern syntax applied
    ).select('-password');

    if (!updatedAdmin) return res.status(404).json({ message: "Admin workspace missing." });
    res.status(200).json(updatedAdmin);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/admin-signature', verifyToken, async (req, res) => {
  const { signature } = req.body;
  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.id,
      { $set: { signature } },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');
    if (!updatedAdmin) return res.status(404).json({ message: "Admin workspace missing." });
    res.status(200).json({ message: 'Signature updated successfully', signature: updatedAdmin.signature });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/admin-subscription', verifyToken, async (req, res) => {
  const {
    selectedPlanName, planPrice,
    subscriptionExpiry, durationMonths, autoRenew,
    action, couponCode, originalPrice
  } = req.body;

  try {
    const updatePayload = {};
    const currentAdmin = await Admin.findById(req.user.id).select('subscriptionExpiry');

    if (action === 'cancel') {
      updatePayload.hasPaidTier = false;
      updatePayload.selectedPlanName = 'None';
      updatePayload.planPrice = '0';
      updatePayload.subscriptionExpiry = null;
      updatePayload.autoRenew = false;
    } else {
      if (selectedPlanName !== undefined) {
        updatePayload.selectedPlanName = selectedPlanName;
        updatePayload.hasPaidTier = selectedPlanName !== 'None';
      }
      if (planPrice !== undefined) updatePayload.planPrice = planPrice;
      if (subscriptionExpiry !== undefined) {
        updatePayload.subscriptionExpiry = subscriptionExpiry ? new Date(subscriptionExpiry) : null;
      } else if (durationMonths !== undefined) {
        const currentExpiry = currentAdmin?.subscriptionExpiry ? new Date(currentAdmin.subscriptionExpiry) : null;
        const baseDate = currentExpiry && currentExpiry > new Date()
          ? currentExpiry
          : new Date();
        updatePayload.subscriptionExpiry = addMonthsToDate(baseDate, Number(durationMonths) || getPlanDurationMonths(selectedPlanName));
      }
      if (autoRenew !== undefined) updatePayload.autoRenew = autoRenew;
    }

    if (!Object.keys(updatePayload).length) {
      return res.status(400).json({ message: 'No subscription changes were provided.' });
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.id,
      { $set: updatePayload },
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!updatedAdmin) return res.status(404).json({ message: 'Admin workspace not found.' });

    // CREATE SUBSCRIPTION & INVOICE RECORD (if upgrading, not cancelling)
    if (action !== 'cancel' && selectedPlanName && selectedPlanName !== 'None') {
      try {
        const Subscription = require('../models/Subscription');
        const Invoice = require('../models/Invoice');
        const Coupon = require('../models/Coupon');
        
        let discountApplied = 0;
        let finalAmountPaid = Number(planPrice) || 0;
        let originalAmount = Number(originalPrice) || finalAmountPaid;
        
        if (couponCode) {
           const appliedCoupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), status: 'active' });
           if (appliedCoupon) {
               discountApplied = originalAmount - finalAmountPaid;
               appliedCoupon.usedCount += 1;
               appliedCoupon.usedBy.push({
                   adminId: updatedAdmin._id,
                   companyName: updatedAdmin.companyName,
                   planName: selectedPlanName,
                   originalAmount,
                   discountApplied,
                   finalAmountPaid
               });
               await appliedCoupon.save();
           }
        }
        
        const newSub = new Subscription({
          company: updatedAdmin._id,
          planName: selectedPlanName,
          status: 'Active',
          startDate: new Date(),
          expiryDate: updatedAdmin.subscriptionExpiry,
          maxEmployees: updatedAdmin.employeeQuotaTarget,
          pricePaid: finalAmountPaid,
          billingCycle: durationMonths >= 12 ? 'Yearly' : 'Monthly'
        });
        await newSub.save();

        const invoice = new Invoice({
          company: updatedAdmin._id,
          invoiceNumber: `INV-${Date.now()}`,
          subscriptionId: newSub._id,
          amount: finalAmountPaid,
          totalAmount: finalAmountPaid,
          status: 'Paid',
          paymentDate: new Date()
        });
        await invoice.save();
      } catch (err) {
        console.error("Failed to create invoice/subscription record:", err);
      }
    }

    res.status(200).json(updatedAdmin);
  } catch (err) {
    console.error('Subscription update failed:', err.message);
    res.status(500).json({ message: 'Failed to update subscription.' });
  }
});

// ==========================================
// 🎟️ VALIDATE COUPON
// ==========================================
router.post('/validate-coupon', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: "Coupon code is required" });

        const Coupon = require('../models/Coupon');
        const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), status: 'active' });

        if (!coupon) {
            return res.status(404).json({ message: "Invalid or inactive coupon code." });
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ message: "This coupon has expired." });
        }

        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ message: "This coupon has reached its maximum usage limit." });
        }

        res.status(200).json({
            message: "Coupon applied successfully!",
            discountType: coupon.discountType,
            discountValue: coupon.discountValue
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to validate coupon", error: err.message });
    }
});

// ==========================================
// 🔑 PASSWORD RECOVERY
// ==========================================
router.post('/forgot-password', async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ message: "Email and role are required." });

  try {
    let user = null;
    const normalizedRole = role.toLowerCase();
    if (normalizedRole === 'admin') {
      user = await Admin.findOne({ email });
    } else if (normalizedRole === 'superadmin') {
      user = await Superadmin.findOne({ email });
    } else if (normalizedRole === 'employee' || normalizedRole === 'hr') {
      user = await Employee.findOne({ email });
    }

    if (!user) return res.status(404).json({ message: "No account found with that email in this workspace." });

    // Generate a simple 4-digit OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Resolve SMTP settings dynamically
    let smtpConfig = null;
    if (normalizedRole === 'admin' && user.smtpSettings && user.smtpSettings.host) {
      smtpConfig = {
        host: user.smtpSettings.host,
        port: user.smtpSettings.port || 587,
        secure: user.smtpSettings.port === 465,
        auth: {
          user: user.smtpSettings.user,
          pass: user.smtpSettings.pass
        }
      };
    } else if ((normalizedRole === 'employee' || normalizedRole === 'hr') && user.company) {
      const parentAdmin = await Admin.findById(user.company);
      if (parentAdmin && parentAdmin.smtpSettings && parentAdmin.smtpSettings.host) {
        smtpConfig = {
          host: parentAdmin.smtpSettings.host,
          port: parentAdmin.smtpSettings.port || 587,
          secure: parentAdmin.smtpSettings.port === 465,
          auth: {
            user: parentAdmin.smtpSettings.user,
            pass: parentAdmin.smtpSettings.pass
          }
        };
      }
    }

    if (!smtpConfig) {
      // Check SystemSetting
      const SystemSetting = require('../models/SystemSetting');
      const sysSetting = await SystemSetting.findOne();
      if (sysSetting && sysSetting.smtpSettings && sysSetting.smtpSettings.host) {
        smtpConfig = {
          host: sysSetting.smtpSettings.host,
          port: sysSetting.smtpSettings.port || 587,
          secure: sysSetting.smtpSettings.port === 465,
          auth: {
            user: sysSetting.smtpSettings.user,
            pass: sysSetting.smtpSettings.password
          }
        };
      }
    }

    let emailSent = false;
    if (smtpConfig && smtpConfig.host && smtpConfig.auth.user) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpConfig.host,
          port: smtpConfig.port,
          secure: smtpConfig.secure,
          auth: {
            user: smtpConfig.auth.user,
            pass: smtpConfig.auth.pass
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const mailOptions = {
          from: smtpConfig.auth.user,
          to: email,
          subject: 'HRMS Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px;">
              <h2 style="color: #be123c; text-align: center;">HRMS Workspace Recovery</h2>
              <hr style="border: none; border-top: 1px solid #eee;" />
              <p>Hello,</p>
              <p>We received a request to reset the password for your account. Please use the following 4-digit verification code to proceed:</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #fff1f2; color: #be123c; padding: 10px 20px; border-radius: 8px; border: 1px dashed #f43f5e;">
                  ${otp}
                </span>
              </div>
              <p>This verification code is valid for 10 minutes. If you did not request this, please ignore this email or contact support.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
              <p style="font-size: 11px; color: #999; text-align: center;">This is an automated system email. Please do not reply directly.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (mailErr) {
        console.error("Nodemailer dispatch failed:", mailErr);
      }
    }

    res.status(200).json({ message: "OTP sent successfully", otp, emailSent });
  } catch (error) {
    res.status(500).json({ message: "Error processing password reset request." });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, role, newPassword } = req.body;
  if (!email || !role || !newPassword) return res.status(400).json({ message: "Missing required fields." });

  try {
    const { validatePasswordPolicy } = require('../utils/passwordPolicy');
    await validatePasswordPolicy(newPassword.trim());

    let user = null;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    const normalizedRole = role.toLowerCase();

    if (normalizedRole === 'admin') {
      user = await Admin.findOne({ email });
      if (user) {
        user.password = hashedPassword;
        await user.save();
      }
    } else if (normalizedRole === 'superadmin') {
      user = await Superadmin.findOne({ email });
      if (user) {
        user.password = hashedPassword;
        await user.save();
      }
    } else if (normalizedRole === 'employee' || normalizedRole === 'hr') {
      const employees = await Employee.find({ email });
      if (employees && employees.length > 0) {
        for (const emp of employees) {
          emp.password = hashedPassword;
          await emp.save();
        }
        user = employees[0];
      }
    }

    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    if (error.message && (error.message.includes("Password") || error.message.includes("complexity"))) {
      return res.status(400).json({ message: error.message });
    }
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Error resetting password." });
  }
});

// POST SSO Test Login Simulation
router.post('/sso/test-login', async (req, res) => {
    try {
        const { provider, clientId, clientSecret, idpUrl } = req.body;
        
        // Key validation check
        if (!clientId || !clientSecret || !idpUrl || provider === 'None') {
            return res.status(400).json({ 
                success: false, 
                message: "SSO: Connection failed. Ask Admin for key to complete the connection with exterior things." 
            });
        }
        
        res.status(200).json({ 
            success: true, 
            message: `SSO authentication simulated successfully via ${provider}.` 
        });
    } catch (err) {
        res.status(500).json({ message: "Error simulating SSO login." });
    }
});

// POST /sso/resolve: Resolve email domain, check SSO settings, and return redirect info
router.post('/sso/resolve', async (req, res) => {
    const SsoLoginLog = require('../models/SsoLoginLog');
    const CompanySettings = require('../models/CompanySettings');
    const SystemSetting = require('../models/SystemSetting');
    const Admin = require('../models/Admin');
    const Employee = require('../models/Employee');

    const email = req.body.email ? req.body.email.trim().toLowerCase() : "";
    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required to resolve SSO settings." });
    }

    try {
        // 1. Check if SSO is enabled globally
        const sysSettings = await SystemSetting.findOne();
        const globalSso = sysSettings ? sysSettings.globalSsoSettings : { enabled: true, supportedProviders: ['Google', 'AzureAD', 'Okta', 'Auth0', 'SAML', 'OIDC'] };
        if (!globalSso || !globalSso.enabled) {
            return res.status(400).json({ success: false, message: "SSO module is globally disabled by Super Admin." });
        }

        // 2. Resolve user & their company
        let user = await Employee.findOne({ email });
        let companyId = null;
        let userRole = 'employee';
        
        if (user) {
            companyId = user.company;
            userRole = user.role ? user.role.toLowerCase() : 'employee';
        } else {
            user = await Admin.findOne({ email });
            if (user) {
                companyId = user._id;
                userRole = 'admin';
            }
        }

        if (!user || !companyId) {
            return res.status(404).json({ success: false, message: "No registered HRMS user found with this email." });
        }

        // 3. Check Company subscription plan (only Enterprise gets SSO)
        const adminUser = await Admin.findById(companyId);
        if (!adminUser) {
            return res.status(404).json({ success: false, message: "Parent company administrator account not found." });
        }

        if (adminUser.selectedPlanName !== 'Enterprise') {
            return res.status(403).json({ success: false, message: "SSO is restricted to Enterprise subscription plan tiers only." });
        }

        // 4. Retrieve Company Settings
        const settings = await CompanySettings.findOne({ company: companyId });
        if (!settings || !settings.ssoSettings || !settings.ssoSettings.enabled || !settings.ssoSettings.isConnected) {
            return res.status(400).json({ success: false, message: "SSO has not been configured or connected by your Company Admin." });
        }

        const sso = settings.ssoSettings;
        if (!globalSso.supportedProviders.includes(sso.provider)) {
            return res.status(400).json({ success: false, message: `The identity provider ${sso.provider} is currently not supported globally.` });
        }

        // 5. Build mock authorization redirect URL
        const mockRedirectUrl = `/sso-callback?email=${encodeURIComponent(email)}&provider=${encodeURIComponent(sso.provider)}&companyId=${encodeURIComponent(companyId)}`;

        res.status(200).json({
            success: true,
            provider: sso.provider,
            companyName: settings.companyName,
            redirectUrl: mockRedirectUrl
        });

    } catch (err) {
        console.error("SSO Resolve Error:", err);
        res.status(500).json({ success: false, message: "Server error resolving SSO settings." });
    }
});

// POST /sso/callback: Process authentication callback, verify details, log security audit, and issue JWT token
router.post('/sso/callback', async (req, res) => {
    const SsoLoginLog = require('../models/SsoLoginLog');
    const CompanySettings = require('../models/CompanySettings');
    const Admin = require('../models/Admin');
    const Employee = require('../models/Employee');

    const { email, provider, companyId } = req.body;

    if (!email || !provider || !companyId) {
        try {
            await SsoLoginLog.create({
                email: email || 'unknown@example.com',
                companyName: 'Unknown',
                provider: provider || 'Unknown',
                status: 'Failed',
                message: 'Callback parameters missing',
                ipAddress: req.ip
            });
        } catch (e) {}

        return res.status(400).json({ success: false, message: "Callback parameters (email, provider, companyId) are required." });
    }

    try {
        const settings = await CompanySettings.findOne({ company: companyId });
        const companyName = settings ? settings.companyName : 'Unknown Company';

        // 1. Fetch user
        let user = await Employee.findOne({ email, company: companyId });
        let resolvedRole = 'employee';

        if (user) {
            const actualDbRole = user.role ? user.role.toLowerCase() : "employee";
            resolvedRole = (actualDbRole === 'hr') ? 'hr' : 'employee';
        } else {
            user = await Admin.findOne({ email, _id: companyId });
            if (user) {
                resolvedRole = 'admin';
            }
        }

        if (!user) {
            await SsoLoginLog.create({
                email,
                companyName,
                provider,
                status: 'Failed',
                message: 'User does not exist in target tenant registry',
                ipAddress: req.ip
            });
            return res.status(400).json({ success: false, message: "User is not registered under this company tenant." });
        }

        // 2. Verify active subscription tier
        const adminUser = await Admin.findById(companyId);
        if (!adminUser || adminUser.selectedPlanName !== 'Enterprise') {
            await SsoLoginLog.create({
                email,
                companyName,
                provider,
                status: 'Failed',
                message: 'Subscription plan tier is not Enterprise',
                ipAddress: req.ip
            });
            return res.status(403).json({ success: false, message: "SSO requires an Enterprise plan subscription." });
        }

        // 3. Create Login Audit Log
        await SsoLoginLog.create({
            email,
            companyName,
            provider,
            status: 'Success',
            message: `Authenticated via SSO IDP (${provider})`,
            ipAddress: req.ip
        });

        // 4. Generate JWT Token
        const token = jwt.sign(
            { id: user._id, role: resolvedRole, company: companyId },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).json({
            success: true,
            message: "Single Sign-On login successful",
            token,
            role: resolvedRole,
            name: user.name,
            email: user.email
        });

    } catch (err) {
        console.error("SSO Callback Error:", err);
        try {
            await SsoLoginLog.create({
                email,
                companyName: 'Unknown Error',
                provider,
                status: 'Failed',
                message: err.message || 'Internal callback validation fault',
                ipAddress: req.ip
            });
        } catch (e) {}

        res.status(500).json({ success: false, message: "Server error during SSO login validation." });
    }
});

// GET /api/auth/active-features - Returns allowed modules for the user's company
router.get('/active-features', verifyToken, async (req, res) => {
    try {
        const SystemSetting = require('../models/SystemSetting');
        const systemSettings = await SystemSetting.findOne();
        
        const sessionTimeoutSettings = {
            enableSessionTimeout: systemSettings ? systemSettings.enableSessionTimeout : false,
            sessionTimeout: systemSettings ? systemSettings.sessionTimeout : '30 Minutes',
            sessionTimeoutMinutes: systemSettings ? (systemSettings.sessionTimeoutMinutes || 30) : 30
        };

        // All features enabled by default — merged with plan-specific settings if a plan exists
        const allModules = {
            attendance: true,
            leave: true,
            payroll: true,
            announcement: true,
            asset: true,
            recruitment: true,
            compliance: true,
            training: true,
            projects: true,
            documents: true,
            expense: true,
            performance: true,
            globalChat: true
        };

        if (req.user.role === 'superadmin') {
            return res.status(200).json({ ...allModules, sessionTimeoutSettings });
        }

        let adminId;
        if (req.user.role === 'admin' || req.user.role === 'hr') {
            adminId = req.user.id;
        } else {
            const Employee = require('../models/Employee');
            const emp = await Employee.findById(req.user.id).select('company');
            if (!emp) return res.status(404).json({ message: "Employee not found." });
            adminId = emp.company;
        }

        const Admin = require('../models/Admin');
        const admin = await Admin.findById(adminId).select('selectedPlanName');
        if (!admin) return res.status(200).json({ ...allModules, sessionTimeoutSettings }); // fallback: all enabled

        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const plan = await SubscriptionPlan.findOne({ name: admin.selectedPlanName });

        // Merge plan-specific settings on top of defaults (plan can restrict, but defaults are all-on)
        if (plan && plan.modules) {
            const planModules = plan.modules.toObject ? plan.modules.toObject() : plan.modules;
            Object.assign(allModules, planModules);
        }

        // Apply Super Admin global overrides (Feature Flag Controllers)
        if (systemSettings && systemSettings.modules) {
            const sysModules = systemSettings.modules.toObject ? systemSettings.modules.toObject() : systemSettings.modules;
            
            const overrides = {
                attendance: sysModules.attendance,
                leave: sysModules.leave,
                payroll: sysModules.payroll,
                performance: sysModules.performance,
                recruitment: sysModules.recruitment,
                training: sysModules.training,
                asset: sysModules.asset,
                expense: sysModules.expense,
                documents: sysModules.document,
                globalChat: sysModules.chat,
                announcement: sysModules.announcements,
            };

            Object.keys(overrides).forEach(key => {
                if (overrides[key] === false) {
                    allModules[key] = false;
                }
            });
        }

        res.status(200).json({ ...allModules, sessionTimeoutSettings });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;