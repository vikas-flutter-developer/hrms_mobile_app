const express = require('express');
const router = express.Router();
const CompanySettings = require('../models/CompanySettings');
const auth = require('../middleware/auth');

// GET Company Settings
router.get('/', auth, async (req, res) => {
  try {
    let settings = await CompanySettings.findOne({
      company: req.user.company
    });
    if (!settings) {
      const Admin = require('../models/Admin');
      const adminUser = await Admin.findById(req.user.company);
      const companyName = adminUser ? adminUser.companyName : 'My Company';
      settings = new CompanySettings({
        company: req.user.company,
        companyName
      });
      await settings.save();
    }
    res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error fetching company settings."
    });
  }
});

// UPDATE Company Settings
router.put('/', auth, async (req, res) => {
  try {
    let settings = await CompanySettings.findOne({
      company: req.user.company
    });
    if (settings) {
      settings = await CompanySettings.findOneAndUpdate({
        company: req.user.company
      }, req.body, {
        new: true,
        runValidators: true
      });
    } else {
      settings = new CompanySettings({
        ...req.body,
        company: req.user.company
      });
      await settings.save();
    }
    res.status(200).json({
      message: "Company settings updated successfully",
      settings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error updating company settings."
    });
  }
});

// GET SSO Settings
router.get('/sso', auth, async (req, res) => {
  try {
    const settings = await CompanySettings.findOne({
      company: req.user.company
    });
    if (!settings) {
      return res.status(200).json({
        enabled: false,
        provider: 'None',
        clientId: '',
        clientSecret: '',
        idpUrl: '',
        isConnected: false
      });
    }
    res.status(200).json(settings.ssoSettings || {
      enabled: false,
      provider: 'None',
      clientId: '',
      clientSecret: '',
      idpUrl: '',
      isConnected: false
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error fetching SSO settings."
    });
  }
});

// UPDATE SSO Settings
router.put('/sso', auth, async (req, res) => {
  try {
    let settings = await CompanySettings.findOne({
      company: req.user.company
    });
    if (!settings) {
      const Admin = require('../models/Admin');
      const adminUser = await Admin.findById(req.user.company);
      const companyName = adminUser ? adminUser.companyName : 'My Company';
      settings = new CompanySettings({
        company: req.user.company,
        companyName
      });
    }
    settings.ssoSettings = {
      ...settings.ssoSettings,
      ...req.body
    };
    await settings.save();
    res.status(200).json({
      message: "SSO settings updated successfully",
      ssoSettings: settings.ssoSettings
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error updating SSO settings."
    });
  }
});

// TEST SSO Connection
router.post('/sso/test', auth, async (req, res) => {
  try {
    const {
      provider,
      clientId,
      clientSecret,
      tenantId,
      idpUrl
    } = req.body;

    // 1. Check if SSO enabled globally & supported
    const SystemSetting = require('../models/SystemSetting');
    const sysSettings = await SystemSetting.findOne();
    const globalSso = sysSettings ? sysSettings.globalSsoSettings : {
      enabled: true,
      supportedProviders: ['Google', 'AzureAD', 'Okta', 'Auth0', 'SAML', 'OIDC']
    };
    if (!globalSso || !globalSso.enabled) {
      return res.status(400).json({
        success: false,
        message: "Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }
    if (!provider || provider === 'None' || !globalSso.supportedProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }

    // 2. Check subscription tier: Only Enterprise gets SSO
    const Admin = require('../models/Admin');
    const adminUser = await Admin.findById(req.user.company);
    if (!adminUser || adminUser.selectedPlanName !== 'Enterprise') {
      return res.status(403).json({
        success: false,
        message: "SSO is a premium Enterprise-tier feature. Please upgrade your subscription plan."
      });
    }

    // 3. Verify credentials exist
    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        message: "Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }

    // Provider specific credential checks
    if (provider === 'AzureAD' && !tenantId || (provider === 'SAML' || provider === 'OIDC') && !idpUrl) {
      return res.status(400).json({
        success: false,
        message: "Connection failed. Ask Admin for key to complete the connection with exterior things."
      });
    }

    // Mark as connected in settings
    let settings = await CompanySettings.findOne({
      company: req.user.company
    });
    if (settings) {
      settings.ssoSettings.isConnected = true;
      settings.ssoSettings.provider = provider;
      settings.ssoSettings.clientId = clientId;
      settings.ssoSettings.clientSecret = clientSecret;
      settings.ssoSettings.tenantId = tenantId || '';
      settings.ssoSettings.idpUrl = idpUrl || '';
      await settings.save();
    }
    res.status(200).json({
      success: true,
      message: `SSO connection to ${provider} was tested and established successfully!`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error testing SSO connection."
    });
  }
});

// GET Admin Integrations
router.get('/integrations', auth, async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const adminUser = await Admin.findById(req.user.company);
    if (!adminUser) return res.status(404).json({ message: "Admin not found" });
    res.status(200).json({
      attendanceSettings: adminUser.attendanceSettings || {},
      jobBoardIntegrations: adminUser.jobBoardIntegrations || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching integrations." });
  }
});

// UPDATE Admin Integrations (Attendance)
router.put('/integrations/attendance', auth, async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.company,
      { $set: { attendanceSettings: req.body } },
      { new: true }
    );
    res.status(200).json({ message: "Attendance settings updated", attendanceSettings: updatedAdmin.attendanceSettings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating attendance integrations." });
  }
});

// UPDATE Admin Integrations (Job Boards)
router.put('/integrations/job-boards', auth, async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.user.company,
      { $set: { jobBoardIntegrations: req.body } },
      { new: true }
    );
    res.status(200).json({ message: "Job board integrations updated", jobBoardIntegrations: updatedAdmin.jobBoardIntegrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating job board integrations." });
  }
});

module.exports = router;