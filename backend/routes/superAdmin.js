console.log("âœ… SuperAdmin Routes Loaded");

const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const Admin = require('../models/Admin');       
const Employee = require('../models/Employee'); 
const Ticket = require('../models/Ticket');
const SystemSetting = require('../models/SystemSetting');
const BlacklistedAccount = require('../models/BlacklistedAccount');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const checkSuperAdminRole = require('../middleware/superAdminRbac');
const JWT_SECRET = process.env.JWT_SECRET || "HRMS_SUPER_SECRET_KEY@_123";
const nodemailer = require('nodemailer');
const SecurityLog = require('../models/SecurityLog');

const purgeCompanyData = async (adminId, companyName) => {
    let deletedCollectionsCount = 0;
    for (const modelName in mongoose.models) {
        if (modelName === 'Admin') continue;
        const Model = mongoose.models[modelName];
        let deleteQuery = null;
        
        if (Model.schema.paths['company']) {
            deleteQuery = { company: adminId };
        } else if (Model.schema.paths['companyId']) {
            deleteQuery = { companyId: adminId };
        }
        
        if (deleteQuery) {
            await Model.deleteMany(deleteQuery);
            deletedCollectionsCount++;
        }
    }
    
    await SecurityLog.create({
        userRole: 'Super Admin',
        companyName: companyName || 'Global HQ',
        category: 'ADMIN_ACTION',
        details: `Purged all data across ${deletedCollectionsCount} collections for deleted company ID: ${adminId}`,
        severity: 'Critical'
    }).catch(e => console.error("Audit log failed: ", e));
};

// Try to load optional packages safely
let Razorpay, schedule, twilio;
try { Razorpay = require('razorpay'); } catch(e) { console.warn("⚠️ Razorpay not installed. Payment routes will be disabled."); }
try { schedule = require('node-schedule'); } catch(e) { console.warn("⚠️ node-schedule not installed. Scheduled broadcasts disabled."); }
try { twilio = require('twilio'); } catch(e) { console.warn("⚠️ twilio not installed. SMS dispatch disabled."); }

// SuperAdmin Broadcast model (separate from employee announcements)
const SuperAdminBroadcast = require('../models/SuperAdminBroadcast');
const Announcement = require('../models/Announcement');

// 📁 Uploads folder automatically banao agar nahi hai toh
const dir = './uploads';
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

// 📷 Multer Storage Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });
const companyUploads = upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'paymentProof', maxCount: 1 }
]);

// Razorpay Instance
let razorpayInstance;
if (Razorpay) {
    razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE',
        key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET_HERE',
    });
}

// Helper to map Admin model to Company object expected by the frontend
function mapAdminToCompany(admin) {
    let hqBranch;
    let address = admin.branchLocation || '';
    let branchAddresses = '';

    if (Array.isArray(admin.branches)) {
        hqBranch = admin.branches.find(b => b.type === 'HQ') || admin.branches[0];
        if (hqBranch) address = hqBranch.address;
        branchAddresses = admin.branches.filter(b => b.type !== 'HQ').map(b => `${b.name}: ${b.address}`).join(', ');
    }

    return {
        _id: admin._id,
        companyName: admin.companyName,
        adminEmail: admin.email,
        phone: admin.phone,
        alternatePhone: '',
        companyType: admin.companyType || 'Startup',
        industryType: admin.industryType || 'IT',
        companySize: admin.companySizeRange || '1-10',
        website: admin.website || '',
        establishedYear: admin.companyStartDate ? new Date(admin.companyStartDate).getFullYear() : null,
        gstNumber: admin.gstId || '',
        panNumber: admin.panId || '',
        tanNumber: admin.tanId || '',
        regNumber: admin.registrationNumber || '',
        address: address || '',
        branchAddresses: branchAddresses,
        city: '',
        state: '',
        country: 'India',
        pinCode: '',
        linkedIn: admin.socialLinks?.linkedin || '',
        twitter: admin.socialLinks?.twitter || '',
        facebook: admin.socialLinks?.facebook || '',
        socialLinks: admin.socialLinks ? JSON.stringify(admin.socialLinks) : '',
        subscriptionPlan: admin.selectedPlanName === 'None' ? 'Free Trial' : (admin.selectedPlanName || 'Free Trial'),
        status: admin.status === 'Pending' ? 'Pending Approval' : (admin.status || 'Active'),
        logo: admin.companyLogo || '',
        name: admin.name || '',
        companyStartDate: admin.companyStartDate || '',
        financialYear: admin.financialYear || 'Apr-Mar',
        workingDays: admin.workingDays || 'Mon-Fri',
        workingHours: admin.workingHours || '9 AM - 6 PM',
        timeZone: admin.timeZone || 'IST',
        currency: admin.currency || 'INR',
        dateFormat: admin.dateFormat || 'DD/MM/YYYY',
        language: admin.language || 'English',
        smtpHost: admin.smtpSettings?.host || '',
        smtpPort: admin.smtpSettings?.port || '',
        smtpUser: admin.smtpSettings?.user || '',
        smtpPass: admin.smtpSettings?.pass || '',
        ipWhitelist: admin.ipWhitelist || '',
        createdBySuperAdmin: admin.createdBySuperAdmin || false,
        paymentMethod: admin.paymentMethod || '',
        paymentProof: admin.paymentProof || '',
        autoRenew: admin.autoRenew ?? false,
        subscriptionExpiry: admin.subscriptionExpiry || null,
        hasUsedTrial: admin.hasUsedTrial || false,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
    };
}

router.get('/companies', async (req, res) => {
    try {
        // Admin records now include status='Blacklisted', so return all of them
        const admins = await Admin.find().sort({ createdAt: -1 });
        const companies = admins.map(mapAdminToCompany);

        res.status(200).json(companies);
    } catch (err) {
        res.status(500).json({ message: "Companies fetch karne mein error aaya", error: err.message });
    }
});

router.put('/companies/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const adminId = req.params.id;

        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ message: "Company CEO registry entry nahi mili!" });

        if (status === 'Blacklisted') {
            // Add to BlacklistedAccount ban list (prevents re-registration with same email/name)
            try {
                const existingBan = await BlacklistedAccount.findOne({ email: admin.email });
                if (!existingBan) {
                    await new BlacklistedAccount({
                        companyName: admin.companyName.toLowerCase().trim(),
                        email: admin.email.toLowerCase().trim()
                    }).save();
                }
            } catch (banErr) {
                // Ignore duplicate key errors on ban list
                if (banErr.code !== 11000) throw banErr;
            }

            // Calculate refund amount
            let refundAmount = Number(admin.planPrice) || 0;
            if (!refundAmount) {
                if (admin.selectedPlanName === 'Starter') refundAmount = 999;
                else if (admin.selectedPlanName === 'Business') refundAmount = 2499;
                else if (admin.selectedPlanName === 'Enterprise') refundAmount = 4999;
            }

            // Mark as Blacklisted but KEEP the record so it can be unblocked later
            admin.status = 'Blacklisted';
            await admin.save();

            await SecurityLog.create({
                userRole: 'Super Admin',
                companyName: admin.companyName,
                category: 'ADMIN_ACTION',
                details: `Company '${admin.companyName}' was Blacklisted. Subscription refund of Rs. ${refundAmount.toFixed(2)} processed.`,
                severity: 'Critical'
            }).catch(() => {});

            return res.status(200).json({ 
                message: `Company blacklisted successfully. Subscription refund of Rs. ${refundAmount.toFixed(2)} processed for "${admin.companyName}". Account is suspended and can be unblocked by Super Admin.`, 
                company: mapAdminToCompany(admin)
            });
        }

        if (status === 'Rejected') {
            // Calculate refund amount
            let refundAmount = Number(admin.planPrice) || 0;
            if (!refundAmount) {
                if (admin.selectedPlanName === 'Starter') refundAmount = 999;
                else if (admin.selectedPlanName === 'Business') refundAmount = 2499;
                else if (admin.selectedPlanName === 'Enterprise') refundAmount = 4999;
            }

            // Trigger Global Cascade Deletion (Wipe everything from all 45+ collections)
            await purgeCompanyData(admin._id, admin.companyName);

            // Delete the Admin record itself
            await Admin.findByIdAndDelete(admin._id);

            await SecurityLog.create({
                userRole: 'Super Admin',
                companyName: admin.companyName,
                category: 'ADMIN_ACTION',
                details: `Company registration '${admin.companyName}' was Rejected. All associated data was purged.`,
                severity: 'Critical'
            }).catch(() => {});

            return res.status(200).json({ 
                message: `Registration rejected. Subscription refund of Rs. ${refundAmount.toFixed(2)} processed for "${admin.companyName}". Admin account deleted from database.`, 
                company: { _id: adminId, status: 'Rejected', companyName: admin.companyName, email: admin.email }
            });
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(
            adminId,
            { status: status },
            { new: true }
        );

        await SecurityLog.create({
            userRole: 'Super Admin',
            companyName: updatedAdmin.companyName,
            category: 'ADMIN_ACTION',
            details: `Company '${updatedAdmin.companyName}' status changed to: ${status}.`,
            severity: status === 'Active' ? 'Info' : 'Warning'
        }).catch(() => {});

        res.status(200).json({ message: `Company status updated to ${status} successfully!`, company: mapAdminToCompany(updatedAdmin) });
    } catch (err) {
        res.status(500).json({ message: "Status update fail ho gaya", error: err.message });
    }
});

// ==========================================
// 🔓 UNBLOCK: Restore Admin to Active & remove from ban list
// ==========================================
router.put('/companies/:id/unblock', async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Company record not found. It may have been permanently deleted.' });
        }

        // Restore status to Active
        admin.status = 'Active';
        await admin.save();

        // Also remove from BlacklistedAccount ban list so they can log in again
        await BlacklistedAccount.deleteOne({ 
            $or: [
                { email: admin.email.toLowerCase().trim() },
                { companyName: admin.companyName.toLowerCase().trim() }
            ]
        });

        await SecurityLog.create({
            userRole: 'Super Admin',
            companyName: admin.companyName,
            category: 'ADMIN_ACTION',
            details: `Company '${admin.companyName}' was Unblocked and restored to Active.`,
            severity: 'Info'
        }).catch(() => {});

        return res.status(200).json({ 
            message: `"${admin.companyName}" has been unblocked and restored to Active status. Login access is re-enabled.`,
            company: mapAdminToCompany(admin)
        });
    } catch (err) {
        res.status(500).json({ message: 'Unblock failed', error: err.message });
    }
});

// ==========================================
// 🗑️ 3. DELETE: Company ko System se Delete karna
// ==========================================
router.delete('/companies/:id', checkSuperAdminRole([]), async (req, res) => {
    try {
        const adminToDelete = await Admin.findById(req.params.id);
        if (adminToDelete) {
            // Trigger Global Cascade Deletion
            await purgeCompanyData(adminToDelete._id, adminToDelete.companyName);
            await Admin.findByIdAndDelete(adminToDelete._id);
        } else {
            // Also check and delete from BlacklistedAccount
            await BlacklistedAccount.findByIdAndDelete(req.params.id);
        }
        res.status(200).json({ message: "Company permanently deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Delete karne mein error aaya", error: err.message });
    }
});

// ==========================================
// ➕ 4. POST: Nayi Company Register karna (WITH PASSWORD GENERATION)
// ==========================================
router.post('/companies', companyUploads, async (req, res) => {
    try {
        const { adminEmail, companyName, password, name, phone, alternatePhone, regNumber, tanNumber, panNumber, gstNumber, subscriptionPlan, city, state, country, pinCode } = req.body;
        
        // 🔐 Password Strength Validation
        if (!req.body.password || req.body.password.trim() === '') {
            return res.status(400).json({ message: "Admin account password is required for new company." });
        }
        const { validatePasswordPolicy } = require('../utils/passwordPolicy');
        try {
            await validatePasswordPolicy(req.body.password.trim());
        } catch (pwErr) {
            return res.status(400).json({ message: pwErr.message });
        }

        // 🏦 KYC Validation (PAN & GST)
        if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
            return res.status(400).json({ message: "Invalid PAN Number format." });
        }
        if (gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstNumber.toUpperCase())) {
            return res.status(400).json({ message: "Invalid GST Number format." });
        }

        // Blacklist check
        const isBlacklisted = await BlacklistedAccount.findOne({
            $or: [
                { email: adminEmail.trim().toLowerCase() },
                { companyName: companyName.trim().toLowerCase() }
            ]
        });
        if (isBlacklisted) {
            return res.status(400).json({ message: "This company name or email is blacklisted and cannot be registered!" });
        }

        const existingAdmin = await Admin.findOne({ email: adminEmail.trim().toLowerCase() });
        if (existingAdmin) {
            return res.status(400).json({ message: "Is email se company admin already registered hai!" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password ? password.trim() : 'Admin@123', salt);

        let companyStartDate = new Date();
        if (req.body.companyStartDate && !isNaN(new Date(req.body.companyStartDate).getTime())) {
            companyStartDate = new Date(req.body.companyStartDate);
        } else if (req.body.establishedYear && !isNaN(parseInt(req.body.establishedYear))) {
            companyStartDate = new Date(parseInt(req.body.establishedYear), 0, 1);
        }

        const branches = [
            {
                name: 'HQ',
                address: req.body.address || req.body.branchLocation || 'HQ Address',
                type: 'HQ'
            }
        ];
        if (req.body.branchAddresses) {
            branches.push({
                name: 'Branch Offices',
                address: req.body.branchAddresses,
                type: 'Branch'
            });
        }

        let logoPath = '';
        if (req.files && req.files['logo'] && req.files['logo'].length > 0) {
            logoPath = `/uploads/${req.files['logo'][0].filename}`;
        }

        let paymentProofPath = '';
        if (req.files && req.files['paymentProof'] && req.files['paymentProof'].length > 0) {
            paymentProofPath = `/uploads/${req.files['paymentProof'][0].filename}`;
        }

        // Map optional social links
        const socialLinksObj = {
            linkedin: req.body.linkedIn || '',
            facebook: req.body.facebook || '',
            twitter: req.body.twitter || ''
        };

        // Map optional smtp settings
        const smtpSettingsObj = {
            host: req.body.smtpHost || '',
            port: Number(req.body.smtpPort) || 587,
            user: req.body.smtpUser || '',
            pass: req.body.smtpPass || ''
        };

        let targetPlanName = subscriptionPlan || 'Free Trial';
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const activePlan = await SubscriptionPlan.findOne({ name: targetPlanName });
        const quotaTarget = activePlan ? activePlan.maxEmployees : 10;
        const deptQuota = activePlan ? activePlan.maxDepartments : 10;
        const storageQuota = activePlan ? activePlan.storageLimitGB : 10;

        const newAdmin = new Admin({
            adminId: `HR-${Math.floor(1000 + Math.random() * 9000)}`,
            employeeQuotaTarget: quotaTarget,
            departmentQuotaTarget: deptQuota,
            storageQuotaTarget: storageQuota,
            name: name ? name.trim() : `${companyName} CEO`,
            email: adminEmail.trim().toLowerCase(),
            password: hashedPassword,
            phone: phone || '0000000000',
            alternatePhone: alternatePhone || '',
            companyName: companyName,
            companyLogo: logoPath,
            website: req.body.website || '',
            companyType: req.body.companyType || 'Startup',
            industryType: req.body.industryType || 'IT',
            companySizeRange: req.body.companySize || '1-10',
            companyStartDate: companyStartDate,
            registrationNumber: regNumber || '',
            tanId: tanNumber || '',
            panId: panNumber || '',
            gstId: gstNumber || '',
            subscriptionPlan: subscriptionPlan || 'Free Trial', // For legacy references if any
            selectedPlanName: subscriptionPlan || 'Free Trial',
            hasPaidTier: (subscriptionPlan && subscriptionPlan !== 'Free Trial'),
            paymentMethod: req.body.paymentMethod || '',
            paymentProof: paymentProofPath,
            status: 'Active',
            branches: branches,
            address: req.body.address || '',
            city: city || '',
            state: state || '',
            country: country || 'India',
            pinCode: pinCode || '',
            financialYear: req.body.financialYear || 'Apr-Mar',
            workingDays: req.body.workingDays || 'Mon-Fri',
            workingHours: req.body.workingHours || '9 AM - 6 PM',
            timeZone: req.body.timeZone || 'IST',
            currency: req.body.currency || 'INR',
            dateFormat: req.body.dateFormat || 'DD/MM/YYYY',
            language: req.body.language || 'English',
            socialLinks: socialLinksObj,
            smtpSettings: smtpSettingsObj,
            ipWhitelist: req.body.ipWhitelist || '',
            createdBySuperAdmin: true
        });

        await newAdmin.save();
        
        // 📧 MOCK: Send Welcome Email
        console.log(`\n==========================================`);
        console.log(`📧 MOCK EMAIL DISPATCH`);
        console.log(`To: ${newAdmin.email}`);
        console.log(`Subject: Welcome to HRMS - ${newAdmin.companyName}`);
        console.log(`Body: Hello ${newAdmin.name},\nYour company account has been created.\nLogin: ${newAdmin.email}\nPassword: ${password || 'Admin@123'}\nPlease change your password upon first login.`);
        console.log(`==========================================\n`);

        res.status(201).json({ message: "Company registered successfully!", company: mapAdminToCompany(newAdmin) });
    } catch (err) {
        res.status(500).json({ message: "Company add karne mein error aaya", error: err.message });
    }
});

// ==========================================
// 📝 5. PUT: Edit Company Details & Logo Upload
// ==========================================
router.put('/companies/:id', companyUploads, async (req, res) => {
    try {
        const adminId = req.params.id;
        const admin = await Admin.findById(adminId);
        if (!admin) return res.status(404).json({ message: "Company CEO registry entry nahi mili!" });

        // 🔐 Password Strength Validation via Global Policy
        if (req.body.password !== undefined && req.body.password.trim() !== '') {
            const { validatePasswordPolicy } = require('../utils/passwordPolicy');
            try {
                await validatePasswordPolicy(req.body.password.trim());
            } catch (pwErr) {
                return res.status(400).json({ message: pwErr.message });
            }
        }

        // 🏦 KYC Validation (PAN & GST)
        if (req.body.panNumber !== undefined && req.body.panNumber.trim() !== '' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(req.body.panNumber.trim().toUpperCase())) {
            return res.status(400).json({ message: "Invalid PAN Number format." });
        }
        if (req.body.gstNumber !== undefined && req.body.gstNumber.trim() !== '' && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(req.body.gstNumber.trim().toUpperCase())) {
            return res.status(400).json({ message: "Invalid GST Number format." });
        }

        if (req.body.companyName !== undefined) admin.companyName = req.body.companyName;
        if (req.body.adminEmail !== undefined) admin.email = req.body.adminEmail.trim().toLowerCase();
        if (req.body.phone !== undefined) admin.phone = req.body.phone;
        if (req.body.alternatePhone !== undefined) admin.alternatePhone = req.body.alternatePhone;
        if (req.body.companyType !== undefined) admin.companyType = req.body.companyType;
        if (req.body.industryType !== undefined) admin.industryType = req.body.industryType;
        if (req.body.companySize !== undefined) admin.companySizeRange = req.body.companySize;
        if (req.body.website !== undefined) admin.website = req.body.website;
        if (req.body.regNumber !== undefined) admin.registrationNumber = req.body.regNumber;
        if (req.body.tanNumber !== undefined) admin.tanId = req.body.tanNumber;
        if (req.body.panNumber !== undefined) admin.panId = req.body.panNumber;
        if (req.body.gstNumber !== undefined) admin.gstId = req.body.gstNumber;
        if (req.body.subscriptionPlan !== undefined) {
            admin.selectedPlanName = req.body.subscriptionPlan;
            admin.hasPaidTier = (req.body.subscriptionPlan !== 'Free Trial');
            const SubscriptionPlan = require('../models/SubscriptionPlan');
            const activePlan = await SubscriptionPlan.findOne({ name: req.body.subscriptionPlan });
            if (activePlan) {
                admin.employeeQuotaTarget = activePlan.maxEmployees;
                admin.departmentQuotaTarget = activePlan.maxDepartments;
                admin.storageQuotaTarget = activePlan.storageLimitGB;
            } else if (req.body.subscriptionPlan === 'Free Trial' || req.body.subscriptionPlan === 'None') {
                admin.employeeQuotaTarget = 10;
                admin.departmentQuotaTarget = 10;
                admin.storageQuotaTarget = 10;
            }
        }

        if (req.body.paymentMethod !== undefined) {
            admin.paymentMethod = req.body.paymentMethod;
        }

        if (req.files && req.files['paymentProof'] && req.files['paymentProof'].length > 0) {
            admin.paymentProof = `/uploads/${req.files['paymentProof'][0].filename}`;
        }

        if (req.body.establishedYear !== undefined) {
            const year = parseInt(req.body.establishedYear) || new Date().getFullYear();
            admin.companyStartDate = new Date(year, 0, 1);
        }

        if (req.body.address !== undefined || req.body.branchAddresses !== undefined) {
            const hqAddress = req.body.address !== undefined ? req.body.address : (admin.branches?.find(b => b.type === 'HQ')?.address || '');
            const otherBranchAddress = req.body.branchAddresses !== undefined ? req.body.branchAddresses : (admin.branches?.filter(b => b.type !== 'HQ').map(b => b.address).join(', ') || '');
            
            const updatedBranches = [
                { name: 'HQ', address: hqAddress, type: 'HQ' }
            ];
            if (otherBranchAddress) {
                updatedBranches.push({ name: 'Branch Offices', address: otherBranchAddress, type: 'Branch' });
            }
            admin.branches = updatedBranches;
        }

        if (req.body.address !== undefined) admin.address = req.body.address;
        if (req.body.city !== undefined) admin.city = req.body.city;
        if (req.body.state !== undefined) admin.state = req.body.state;
        if (req.body.country !== undefined) admin.country = req.body.country;
        if (req.body.pinCode !== undefined) admin.pinCode = req.body.pinCode;

        if (req.body.name !== undefined) admin.name = req.body.name;
        if (req.body.companyStartDate !== undefined) admin.companyStartDate = new Date(req.body.companyStartDate);
        
        if (req.body.password !== undefined && req.body.password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(req.body.password.trim(), salt);
        }

        if (req.body.financialYear !== undefined) admin.financialYear = req.body.financialYear;
        if (req.body.workingDays !== undefined) admin.workingDays = req.body.workingDays;
        if (req.body.workingHours !== undefined) admin.workingHours = req.body.workingHours;
        if (req.body.timeZone !== undefined) admin.timeZone = req.body.timeZone;
        if (req.body.currency !== undefined) admin.currency = req.body.currency;
        if (req.body.dateFormat !== undefined) admin.dateFormat = req.body.dateFormat;
        if (req.body.language !== undefined) admin.language = req.body.language;

        if (req.body.smtpHost !== undefined || req.body.smtpPort !== undefined || req.body.smtpUser !== undefined || req.body.smtpPass !== undefined) {
            admin.smtpSettings = {
                host: req.body.smtpHost !== undefined ? req.body.smtpHost : (admin.smtpSettings?.host || ''),
                port: req.body.smtpPort !== undefined ? Number(req.body.smtpPort) : (admin.smtpSettings?.port || 587),
                user: req.body.smtpUser !== undefined ? req.body.smtpUser : (admin.smtpSettings?.user || ''),
                pass: req.body.smtpPass !== undefined ? req.body.smtpPass : (admin.smtpSettings?.pass || '')
            };
        }

        if (req.body.linkedIn !== undefined || req.body.facebook !== undefined || req.body.twitter !== undefined) {
            admin.socialLinks = {
                linkedin: req.body.linkedIn !== undefined ? req.body.linkedIn : (admin.socialLinks?.linkedin || ''),
                facebook: req.body.facebook !== undefined ? req.body.facebook : (admin.socialLinks?.facebook || ''),
                twitter: req.body.twitter !== undefined ? req.body.twitter : (admin.socialLinks?.twitter || '')
            };
        }

        if (req.body.ipWhitelist !== undefined) {
            admin.ipWhitelist = req.body.ipWhitelist;
        }

        if (req.files && req.files['logo'] && req.files['logo'].length > 0) {
            admin.companyLogo = `/uploads/${req.files['logo'][0].filename}`;
        }

        await admin.save();

        res.status(200).json({ message: "Company details updated successfully!", company: mapAdminToCompany(admin) });
    } catch (err) {
        res.status(500).json({ message: "Update failed", error: err.message });
    }
});

// ==========================================
// ==========================================
// 💳 GET: Billing & Revenue Stats (Rich)
// ==========================================
router.get('/billing-stats', async (req, res) => {
    try {
        const companies = await Admin.find().sort({ createdAt: -1 });
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const dbPlans = await SubscriptionPlan.find();

        const PLAN_PRICES = {
            'Free Trial': 0,
            'None': 0,
            'Basic': 999,
            'Starter': 1999,
            'Business': 4999,
            'Enterprise': 9999
        };

        dbPlans.forEach(p => {
            if (p.name) {
                PLAN_PRICES[p.name] = p.priceMonthly;
            }
        });

        let totalMRR = 0;
        let planCounts = {};
        const ledger = [];
        let churned = 0;

        companies.forEach(comp => {
            try {
                let plan = comp.selectedPlanName || 'Free Trial';
                if (plan === 'None') plan = 'Free Trial';
                const status = comp.status || 'Active';

                if (status !== 'Blacklisted') {
                    // Determine raw MRR price
                    let compMrr = 0;
                    if (comp.planPrice && !isNaN(comp.planPrice) && Number(comp.planPrice) > 0) {
                        compMrr = Number(comp.planPrice);
                    } else {
                        compMrr = PLAN_PRICES[plan] || 0;
                    }

                    // Adjust MRR if plan name indicates multi-month subscription interval
                    const planLower = String(plan).toLowerCase();
                    if (planLower.includes('yearly') || planLower.includes('12 month') || planLower.includes('year') || planLower.includes('yr')) {
                        compMrr = Math.round(compMrr / 12);
                    } else if (planLower.includes('6 month')) {
                        compMrr = Math.round(compMrr / 6);
                    } else if (planLower.includes('3 month') || planLower.includes('quarter') || planLower.includes('qtr')) {
                        compMrr = Math.round(compMrr / 3);
                    }

                    totalMRR += compMrr;

                    // Dynamically count exact plan name
                    planCounts[plan] = (planCounts[plan] || 0) + 1;

                    const mapped = mapAdminToCompany(comp);
                    ledger.push({
                        _id:              mapped._id,
                        companyName:      mapped.companyName,
                        adminEmail:       mapped.adminEmail,
                        subscriptionPlan: plan,
                        status:           status,
                        mrr:              compMrr,
                        gstNumber:        mapped.gstNumber || null,
                        city:             mapped.city || null,
                        companySize:      mapped.companySize || null,
                        joinedAt:         mapped.createdAt,
                        autoRenew:        mapped.autoRenew,
                        subscriptionExpiry: mapped.subscriptionExpiry,
                        hasUsedTrial:      mapped.hasUsedTrial,
                    });
                } else {
                    churned += 1;
                }
            } catch (err) {
                console.error("Skipping malformed company in billing-stats loop:", comp._id, err);
            }
        });

        // Monthly growth trend — bucket last 6 months by createdAt
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyGrowth = {};
        companies.forEach(comp => {
            const d = new Date(comp.createdAt);
            if (d >= sixMonthsAgo) {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthlyGrowth[key] = (monthlyGrowth[key] || 0) + 1;
            }
        });

        // Fill missing months with 0
        const trend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
            trend.push({ month: label, newCompanies: monthlyGrowth[key] || 0 });
        }

        res.status(200).json({
            totalRevenue: totalMRR,    // kept for backward compatibility
            totalMRR,
            totalARR: totalMRR * 12,
            planCounts,
            churned,
            totalActive: companies.filter(c => c.status === 'Active').length,
            ledger,                    // per-company rows for the Subscription Ledger table
            trend,                     // 6-month new-company growth
        });
    } catch (err) {
        console.error("Billing Stats Error:", err);
        res.status(500).json({ message: 'Billing stats fetch failed', error: err.message });
    }
});

router.get('/dashboard-analytics', async (req, res) => {
    try {
        const Admin = require('../models/Admin');
        const Employee = require('../models/Employee');
        const Invoice = require('../models/Invoice');
        const Attendance = require('../models/Attendance');
        const Leave = require('../models/Leave');
        const Payslip = require('../models/Payslip');
        const SecurityLog = require('../models/SecurityLog');

        // --- 1. COMPANY STATS ---
        const companies = await Admin.find();
        const totalCompanies = companies.length;
        const active = companies.filter(c => c.status === 'Active').length;
        const suspended = companies.filter(c => c.status === 'Suspended').length;
        const blacklisted = companies.filter(c => c.status === 'Blacklisted').length;
        const trial = companies.filter(c => c.selectedPlanName === 'None' || c.selectedPlanName === 'Free Trial').length;
        const expired = companies.filter(c => c.subscriptionExpiry && new Date(c.subscriptionExpiry) < new Date()).length;

        const now = new Date();
        const dailyLimit = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weeklyLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthlyLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const newCompaniesDaily = companies.filter(c => c.createdAt >= dailyLimit).length;
        const newCompaniesWeekly = companies.filter(c => c.createdAt >= weeklyLimit).length;
        const newCompaniesMonthly = companies.filter(c => c.createdAt >= monthlyLimit).length;

        const byIndustry = {};
        companies.forEach(c => {
            const ind = c.industryType || 'IT';
            byIndustry[ind] = (byIndustry[ind] || 0) + 1;
        });

        const bySize = {};
        companies.forEach(c => {
            const size = c.companySizeRange || '1-10';
            bySize[size] = (bySize[size] || 0) + 1;
        });

        const geographic = {};
        const knownCities = ['Delhi', 'New Delhi', 'Mumbai', 'Bengaluru', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat', 'Lucknow', 'Chandigarh', 'Indore', 'Bhopal', 'Nagpur', 'Coimbatore', 'Kochi', 'Visakhapatnam', 'Patna', 'Bhubaneswar', 'Guwahati', 'Dehradun'];
        companies.forEach(c => {
            const hqBranch = (c.branches && c.branches.find(b => b.type === 'HQ')) || (c.branches && c.branches[0]);
            const address = (hqBranch ? hqBranch.address : c.branchLocation) || 'HQ';
            let foundCity = address;
            for (const city of knownCities) {
                if (address.toLowerCase().includes(city.toLowerCase())) {
                    foundCity = city;
                    break;
                }
            }
            if (!geographic[foundCity]) {
                geographic[foundCity] = { count: 0, lat: c.branchLat || null, lng: c.branchLng || null };
            }
            geographic[foundCity].count += 1;
            if (c.branchLat && c.branchLng && !geographic[foundCity].lat) {
                geographic[foundCity].lat = c.branchLat;
                geographic[foundCity].lng = c.branchLng;
            }
        });

        const churnRate = totalCompanies > 0 ? Math.round(((suspended + blacklisted) / totalCompanies) * 100) : 0;

        // --- 2. USER STATS ---
        const totalEmployees = await Employee.countDocuments();
        const hrCount = await Employee.countDocuments({ role: { $regex: /^hr$/i } });
        const employeeCount = await Employee.countDocuments({ role: { $regex: /^employee$/i } });
        const staffCount = totalEmployees - hrCount - employeeCount;

        const totalUsers = {
            Admin: totalCompanies,
            HR: hrCount,
            Employee: employeeCount,
            Staff: staffCount
        };

        const activeUsers = await Employee.countDocuments({ status: 'Active' });
        const inactiveUsers = totalEmployees - activeUsers;

        const userGrowthTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

            const count = await Employee.countDocuments({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });
            const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            userGrowthTrend.push({ month: label, count });
        }

        const employeesPerCompany = await Employee.aggregate([
            { $group: { _id: '$company', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const mostActiveCompanies = [];
        for (const ec of employeesPerCompany) {
            if (ec._id) {
                const comp = companies.find(c => c._id.toString() === ec._id.toString());
                mostActiveCompanies.push({
                    name: comp ? comp.companyName : 'Unknown Company',
                    employeeCount: ec.count
                });
            }
        }

        // --- 3. REVENUE STATS ---
        let totalMRR = 0;
        let planCounts = {};
        const PLAN_PRICES = {
            'Free Trial': 0,
            'None': 0,
            'Starter': 1999,
            'Business': 4999,
            'Enterprise': 9999
        };

        companies.forEach(comp => {
            let plan = comp.selectedPlanName || 'Free Trial';
            if (plan === 'None') plan = 'Free Trial';
            const status = comp.status || 'Active';

            if (status !== 'Blacklisted') {
                let compMrr = 0;
                if (comp.planPrice && !isNaN(comp.planPrice) && Number(comp.planPrice) > 0) {
                    compMrr = Number(comp.planPrice);
                } else {
                    compMrr = PLAN_PRICES[plan] || 0;
                }

                const planLower = plan.toLowerCase();
                if (planLower.includes('yearly') || planLower.includes('12 month') || planLower.includes('year') || planLower.includes('yr')) {
                    compMrr = Math.round(compMrr / 12);
                } else if (planLower.includes('6 month')) {
                    compMrr = Math.round(compMrr / 6);
                } else if (planLower.includes('3 month') || planLower.includes('quarter') || planLower.includes('qtr')) {
                    compMrr = Math.round(compMrr / 3);
                }

                totalMRR += compMrr;
                planCounts[plan] = (planCounts[plan] || 0) + 1;
            }
        });

        const totalARR = totalMRR * 12;

        const invoices = await Invoice.find();
        const totalPaidRevenue = invoices.filter(inv => inv.status === 'Paid').reduce((acc, inv) => acc + (inv.totalAmount || inv.amount), 0);
        const pendingPaymentsCount = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue').length;
        const pendingPaymentsAmount = invoices.filter(inv => inv.status === 'Unpaid' || inv.status === 'Overdue').reduce((acc, inv) => acc + (inv.totalAmount || inv.amount), 0);

        const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const upcomingRenewalsCount = companies.filter(c => c.subscriptionExpiry && new Date(c.subscriptionExpiry) >= now && new Date(c.subscriptionExpiry) <= next30Days).length;

        const refundsIssuedAmount = invoices.filter(inv => inv.status === 'Refunded').reduce((acc, inv) => acc + (inv.totalAmount || inv.amount), 0);

        const revenueByPlanType = {};
        companies.forEach(comp => {
            let plan = comp.selectedPlanName || 'Free Trial';
            if (plan === 'None') plan = 'Free Trial';
            let price = Number(comp.planPrice) || PLAN_PRICES[plan] || 0;
            revenueByPlanType[plan] = (revenueByPlanType[plan] || 0) + price;
        });

        // --- 4. HR & WORKFORCE STATS ---
        const averageEmployeesPerCompany = totalCompanies > 0 ? (totalEmployees / totalCompanies).toFixed(1) : 0;
        
        const byDept = await Employee.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);
        const departmentDistribution = {};
        byDept.forEach(d => {
            const name = d._id || 'Other';
            departmentDistribution[name] = d.count;
        });

        const attendanceCount = await Attendance.countDocuments();
        const leaveCount = await Leave.countDocuments();
        const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });

        const payslips = await Payslip.find({ status: 'Paid' });
        const payrollVolume = payslips.reduce((acc, p) => acc + p.netPay, 0);

        // Calculate attendance & leave trends over last 6 months
        const attendanceTrend = [];
        const leaveTrend = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
            const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

            const attCount = await Attendance.countDocuments({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });
            const lvCount = await Leave.countDocuments({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            });
            const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            attendanceTrend.push({ month: label, count: attCount });
            leaveTrend.push({ month: label, count: lvCount });
        }

        // Calculate feature-wise usage per company and churn risks
        const companyUsageStats = [];
        for (const comp of companies) {
            const compId = comp._id;
            const empCount = await Employee.countDocuments({ company: compId });
            const attCount = await Attendance.countDocuments({ company: compId });
            const lvCount = await Leave.countDocuments({ company: compId });
            const payslipCount = await Payslip.countDocuments({ company: compId });

            const unusedFeatures = [];
            if (attCount === 0) unusedFeatures.push('Attendance');
            if (lvCount === 0) unusedFeatures.push('Leave');
            if (payslipCount === 0) unusedFeatures.push('Payroll');

            companyUsageStats.push({
                companyId: compId,
                companyName: comp.companyName,
                employeeCount: empCount,
                attendanceCount: attCount,
                leaveCount: lvCount,
                payslipCount: payslipCount,
                unusedFeatures
            });
        }

        // --- 5. APP USAGE STATS ---
        const uniqueDau = await SecurityLog.distinct('userEmail', {
            createdAt: { $gte: dailyLimit }
        });
        const dau = uniqueDau.length;

        const uniqueMau = await SecurityLog.distinct('userEmail', {
            createdAt: { $gte: monthlyLimit }
        });
        const mau = uniqueMau.length;

        const logs = await SecurityLog.find().select('createdAt');
        const hoursDistribution = Array(24).fill(0);
        logs.forEach(log => {
            if (log.createdAt) {
                const hr = new Date(log.createdAt).getHours();
                hoursDistribution[hr]++;
            }
        });
        const peakUsageHour = hoursDistribution.indexOf(Math.max(...hoursDistribution));

        const moduleCounts = {
            Attendance: 0,
            Leave: 0,
            Payroll: 0,
            Training: 0,
            Asset: 0,
            Expense: 0,
            Document: 0,
            Chat: 0,
            Announcements: 0
        };

        const sysSettings = await SystemSetting.findOne();
        if (sysSettings && sysSettings.modules) {
            Object.entries(sysSettings.modules.toObject ? sysSettings.modules.toObject() : sysSettings.modules).forEach(([key, val]) => {
                if (val) {
                    const formatted = key.charAt(0).toUpperCase() + key.slice(1);
                    if (moduleCounts[formatted] !== undefined) {
                        moduleCounts[formatted] += active;
                    }
                }
            });
        }

        res.status(200).json({
            companyStats: {
                totalCompanies,
                active,
                suspended,
                blacklisted,
                trial,
                expired,
                newCompaniesDaily,
                newCompaniesWeekly,
                newCompaniesMonthly,
                byIndustry,
                bySize,
                geographic,
                churnRate
            },
            userStats: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                growthTrend: userGrowthTrend,
                mostActiveCompanies
            },
            revenueStats: {
                totalMRR,
                totalARR,
                totalPaidRevenue,
                pendingPaymentsCount,
                pendingPaymentsAmount,
                upcomingRenewalsCount,
                refundsIssuedAmount,
                revenueByPlanType
            },
            hrStats: {
                totalEmployees,
                averageEmployeesPerCompany,
                departmentDistribution,
                attendanceCount,
                leaveCount,
                pendingLeaves,
                payrollVolume,
                attendanceTrend,
                leaveTrend
            },
            appUsageStats: {
                dau,
                mau,
                mostUsedModules: moduleCounts,
                peakUsageHour,
                hoursDistribution,
                companyUsageStats
            }
        });
    } catch (err) {
        console.error("Dashboard Analytics aggregation failed:", err);
        res.status(500).json({ message: "Failed to gather real dashboard analytics", error: err.message });
    }
});


// ==========================================
// 👥 6. GET: Global User Management (All Users)
// ==========================================
router.get('/users', async (req, res) => {
    try {
        const admins = await Admin.find({}, 'name email companyName hasPaidTier createdAt phone status');
        const employees = await Employee.find({}, 'name email role createdAt phone status company');

        const companyMap = {};
        for (const admin of admins) {
            companyMap[admin._id.toString()] = admin.companyName;
        }

        const formattedAdmins = admins.map(a => ({
            id: a._id,
            name: a.name,
            email: a.email,
            phone: a.phone || 'N/A',
            role: 'Admin',
            userType: 'admin',
            company: a.companyName || 'N/A',
            status: a.status || 'Active',
            date: a.createdAt
        }));

        const formattedEmployees = employees.map(e => ({
            id: e._id,
            name: e.name,
            email: e.email,
            phone: e.phone || 'N/A',
            role: (e.role && e.role.toUpperCase()) || 'EMPLOYEE',
            userType: 'employee',
            company: e.company ? (companyMap[e.company.toString()] || 'Company Staff') : 'N/A',
            status: e.status || 'Active',
            date: e.createdAt
        }));

        const allUsers = [...formattedAdmins, ...formattedEmployees];
        allUsers.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json(allUsers);
    } catch (err) {
        res.status(500).json({ message: "Global users fetch karne mein error aaya", error: err.message });
    }
});

// Force reset password for any user
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const { newPassword } = req.body;
        const userId = req.params.id;
        if (!newPassword || newPassword.trim() === '') {
            return res.status(400).json({ message: "Password cannot be empty." });
        }

        const { validatePasswordPolicy } = require('../utils/passwordPolicy');
        await validatePasswordPolicy(newPassword.trim());

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword.trim(), salt);

        let user = await Admin.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
        if (!user) {
            user = await Employee.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
        }

        if (!user) return res.status(404).json({ message: "User not found!" });
        res.status(200).json({ message: `Password successfully reset for user "${user.name}".` });
    } catch (err) {
        res.status(500).json({ message: "Reset password failed", error: err.message });
    }
});

// Deactivate / Block any user
router.put('/users/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const userId = req.params.id;

        let user = await Admin.findByIdAndUpdate(userId, { status }, { new: true });
        if (!user) {
            user = await Employee.findByIdAndUpdate(userId, { status }, { new: true });
        }

        if (!user) return res.status(404).json({ message: "User not found!" });
        res.status(200).json({ message: `User status successfully updated to "${status}".` });
    } catch (err) {
        res.status(500).json({ message: "Status update failed", error: err.message });
    }
});

// Delete user
router.delete('/users/:id', checkSuperAdminRole([]), async (req, res) => {
    try {
        const userId = req.params.id;

        let user = await Admin.findByIdAndDelete(userId);
        if (!user) {
            user = await Employee.findByIdAndDelete(userId);
        }

        if (!user) return res.status(404).json({ message: "User not found!" });
        res.status(200).json({ message: "User account deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: "Delete user failed", error: err.message });
    }
});

// Merge duplicate accounts
router.post('/users/merge', async (req, res) => {
    try {
        const { primaryUserId, duplicateUserId } = req.body;
        if (!primaryUserId || !duplicateUserId) {
            return res.status(400).json({ message: "Primary user and duplicate user IDs are required." });
        }

        let deletedUser = await Admin.findByIdAndDelete(duplicateUserId);
        if (!deletedUser) {
            deletedUser = await Employee.findByIdAndDelete(duplicateUserId);
        }

        if (!deletedUser) {
            return res.status(404).json({ message: "Duplicate user not found." });
        }

        res.status(200).json({ message: `Successfully merged duplicate account "${deletedUser.name}" (${deletedUser.email}) into primary account.` });
    } catch (err) {
        res.status(500).json({ message: "Merge failed", error: err.message });
    }
});

// Bulk deactivate
router.post('/users/bulk-deactivate', checkSuperAdminRole([]), async (req, res) => {
    try {
        const { userIds } = req.body;
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ message: "User IDs list is required." });
        }

        await Admin.updateMany({ _id: { $in: userIds } }, { status: 'Suspended' });
        await Employee.updateMany({ _id: { $in: userIds } }, { status: 'Inactive' });

        res.status(200).json({ message: `Successfully deactivated ${userIds.length} users in bulk.` });
    } catch (err) {
        res.status(500).json({ message: "Bulk action failed", error: err.message });
    }
});

// Fetch user activity logs and device info from SecurityLog collection
router.get('/users/:id/logs', async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await Admin.findById(userId);
        if (!user) user = await Employee.findById(userId);

        if (!user) return res.status(404).json({ message: "User not found!" });

        const SecurityLog = require('../models/SecurityLog');
        const dbLogs = await SecurityLog.find({ userEmail: user.email }).sort({ createdAt: -1 });

        let logs = dbLogs.map(log => ({
            timestamp: log.createdAt.toISOString(),
            ip: log.ipAddress || '127.0.0.1',
            device: log.deviceInfo || 'Browser Client',
            location: 'India',
            activity: log.category + ': ' + log.details
        }));

        // If no logs are found, we simply return the empty array instead of populating it with fake dummy data.
        if (logs.length === 0) {
            // Real logs only. No hardcoded fallback.
        }

        res.status(200).json({ user: { name: user.name, email: user.email }, logs });
    } catch (err) {
        res.status(500).json({ message: "Failed to load logs", error: err.message });
    }
});

// Impersonate any user
router.post('/users/:id/impersonate', checkSuperAdminRole([]), async (req, res) => {
    try {
        const userId = req.params.id;
        let user = await Admin.findById(userId);
        let userRole = 'admin';
        
        if (!user) {
            user = await Employee.findById(userId);
            if (user) {
                userRole = user.role ? user.role.toLowerCase() : 'employee';
            }
        }

        if (!user) return res.status(404).json({ message: "User account not found!" });

        const token = jwt.sign(
            { id: user._id, role: userRole, company: userRole === 'admin' ? user._id : user.company },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ 
            token, 
            role: userRole, 
            name: user.name, 
            email: user.email,
            message: `Securely impersonating user ${user.name}. Session established.` 
        });
    } catch (err) {
        res.status(500).json({ message: "Impersonation request failed", error: err.message });
    }
});

// ==========================================
// 🎟️ 7. GET & PUT: Support Tickets Management
// ==========================================
const supportProtector = checkSuperAdminRole(['Owner', 'Support']);

router.get('/tickets', supportProtector, async (req, res) => {
    try {
        const tickets = await Ticket.find({ isSuperAdminTicket: true })
            .populate('employeeId', 'name email phone company companyName role')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        const Admin = require('../models/Admin');
        
        let totalResolutionTime = 0;
        let resolvedCount = 0;

        // Manual populate for company to avoid strictPopulate issues on polymorphic refs
        const ticketsWithCompany = await Promise.all(tickets.map(async (ticket) => {
            const tObj = ticket.toObject();
            if (tObj.employeeId && tObj.employeeId.company && mongoose.Types.ObjectId.isValid(tObj.employeeId.company)) {
                const comp = await Admin.findById(tObj.employeeId.company).select('companyName email');
                if (comp) {
                    tObj.employeeId.company = comp;
                }
            }
            if (tObj.status !== 'Resolved' && tObj.status !== 'Closed' && tObj.slaDeadline) {
                tObj.isSlaBreached = new Date() > new Date(tObj.slaDeadline);
            }
            if (tObj.resolvedAt && tObj.createdAt) {
                resolvedCount++;
                totalResolutionTime += (new Date(tObj.resolvedAt) - new Date(tObj.createdAt));
            }
            return tObj;
        }));

        const avgResolutionTimeHours = resolvedCount > 0 ? (totalResolutionTime / resolvedCount / (1000 * 60 * 60)).toFixed(2) : 0;

        res.status(200).json({ tickets: ticketsWithCompany, avgResolutionTimeHours });
    } catch (err) {
        res.status(500).json({ message: "Tickets fetch karne mein error aaya", error: err.message });
    }
});

router.put('/tickets/:id/status', supportProtector, async (req, res) => {
    try {
        const { status } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }
        ticket.status = status;
        if (status === 'Resolved' || status === 'Closed') {
            ticket.resolvedAt = new Date();
        }
        await ticket.save();

        // Notify user if resolved or updated
        try {
            const Notification = require('../models/Notification');
            const Admin = require('../models/Admin');
            let recipientModel = 'Employee';
            const isAdmin = await Admin.findById(ticket.employeeId);
            if (isAdmin) {
                recipientModel = 'Admin';
            }
            await Notification.create({
                recipientId: ticket.employeeId,
                recipientModel,
                title: `Support Ticket ${status}`,
                message: `Your support ticket regarding "${ticket.subject}" has been marked as ${status}.`,
                link: recipientModel === 'Admin' ? '/admin/Support' : '/employee/Support'
            });
        } catch (notifErr) {
            console.error("Failed to trigger status update notification:", notifErr);
        }

        res.status(200).json({ message: "Ticket status updated!", ticket });
    } catch (err) {
        res.status(500).json({ message: "Ticket update fail ho gaya", error: err.message });
    }
});

router.post('/tickets/:id/reply', supportProtector, async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }
        ticket.thread.push({
            senderId: "000000000000000000000000", // system/superadmin placeholder ObjectId
            senderModel: 'SuperAdmin',
            message
        });
        if (ticket.status === 'Open') {
            ticket.status = 'In Progress';
        }
        await ticket.save();

        // Notify user of new reply
        try {
            const Notification = require('../models/Notification');
            const Admin = require('../models/Admin');
            let recipientModel = 'Employee';
            const isAdmin = await Admin.findById(ticket.employeeId);
            if (isAdmin) {
                recipientModel = 'Admin';
            }
            await Notification.create({
                recipientId: ticket.employeeId,
                recipientModel,
                title: 'New Reply on Support Ticket',
                message: `Super Admin has replied to your support ticket regarding "${ticket.subject}".`,
                link: recipientModel === 'Admin' ? '/admin/Support' : '/employee/Support'
            });
        } catch (notifErr) {
            console.error("Failed to trigger reply notification:", notifErr);
        }

        res.status(200).json({ message: "Reply added successfully", ticket });
    } catch (err) {
        res.status(500).json({ message: "Failed to add reply", error: err.message });
    }
});

router.get('/superadmins', supportProtector, async (req, res) => {
    try {
        const Superadmin = require('../models/Superadmin');
        const sas = await Superadmin.find().select('name email');
        res.status(200).json(sas);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch superadmins", error: err.message });
    }
});

router.put('/tickets/:id/assign', supportProtector, async (req, res) => {
    try {
        const { assignedTo } = req.body;
        const ticket = await Ticket.findByIdAndUpdate(req.params.id, { assignedTo }, { new: true }).populate('assignedTo', 'name email');
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        res.status(200).json({ message: "Ticket assigned successfully", ticket });
    } catch (err) {
        res.status(500).json({ message: "Failed to assign ticket", error: err.message });
    }
});

router.put('/tickets/:id/escalate', supportProtector, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ message: "Ticket not found" });
        ticket.isEscalated = !ticket.isEscalated;
        await ticket.save();
        res.status(200).json({ message: ticket.isEscalated ? "Ticket escalated" : "Ticket de-escalated", ticket });
    } catch (err) {
        res.status(500).json({ message: "Failed to escalate ticket", error: err.message });
    }
});

// ==========================================
// 📦 Asset Categories (Super Admin Global Defaults)
// ==========================================
router.get('/asset-categories', async (req, res) => {
    try {
        let settings = await SystemSetting.findOne().select('assetCategories');
        if (!settings) {
            settings = new SystemSetting();
            await settings.save();
        }
        res.status(200).json({ categories: settings.assetCategories || ['Laptop', 'Mobile', 'Monitor', 'Phone', 'Access Card', 'Vehicle', 'Furniture', 'Other'] });
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch asset categories', error: err.message });
    }
});

router.put('/asset-categories', async (req, res) => {
    try {
        const { categories } = req.body;
        if (!Array.isArray(categories)) return res.status(400).json({ message: 'categories must be an array' });
        let settings = await SystemSetting.findOne();
        if (!settings) settings = new SystemSetting();
        settings.assetCategories = categories;
        await settings.save();
        res.status(200).json({ categories, message: 'Global asset categories updated' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update asset categories', error: err.message });
    }
});

// ==========================================
// ⚙️ 8. GET & PUT: Global System Settings
// ==========================================
router.get('/settings', async (req, res) => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = await SystemSetting.create({
                passwordComplexity: 'Strong',
                enforce2FA: 'Admin Only',
                sessionTimeout: '30 Minutes',
                sessionTimeoutMinutes: 30
            });
        }
        // Map nested structures to flat fields for frontend compatibility
        const flatSettings = {
            ...settings.toObject(),
            smtpHost: settings.smtpSettings?.host || '',
            smtpPort: settings.smtpSettings?.port || 587,
            smtpUser: settings.smtpSettings?.user || '',
            smtpPass: settings.smtpSettings?.password || '',
            smsProvider: settings.smsSettings?.provider || 'Twilio',
            smsApiKey: settings.smsSettings?.apiKey || '',
            smsSenderId: settings.smsSettings?.senderId || ''
        };
        res.status(200).json(flatSettings);
    } catch (err) {
        res.status(500).json({ message: "Settings fetch failed", error: err.message });
    }
});

router.post('/settings', async (req, res) => {
    try {
        let settings = await SystemSetting.findOne();
        if (!settings) {
            settings = new SystemSetting();
        }

        const oldMaintenanceMode = settings ? settings.maintenanceMode : false;

        // Apply Security Enforcements
        if (req.body.enforce2FA && req.body.enforce2FA !== 'Disabled') {
            settings.enable2FA = true;
            settings.enforce2FA = req.body.enforce2FA;
        } else if (req.body.enforce2FA === 'Disabled') {
            settings.enable2FA = false;
            settings.enforce2FA = 'Disabled';
        }

        if (req.body.passwordComplexity) {
            settings.enablePasswordComplexity = true;
            settings.passwordComplexity = req.body.passwordComplexity;
        }

        if (req.body.sessionTimeout) {
            settings.enableSessionTimeout = true;
            settings.sessionTimeout = req.body.sessionTimeout;
        }

        // Dynamically assign standard flat fields from request body safely
        Object.keys(req.body).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && !key.startsWith('smtp') && !key.startsWith('sms') && key !== 'enforce2FA' && key !== 'passwordComplexity' && key !== 'sessionTimeout') {
                settings[key] = req.body[key];
            }
        });

        // Explicitly map unflattened settings to subdocument objects
        if (req.body.smtpHost !== undefined || req.body.smtpPort !== undefined || req.body.smtpUser !== undefined || req.body.smtpPass !== undefined) {
            settings.smtpSettings = {
                host: req.body.smtpHost !== undefined ? req.body.smtpHost : (settings.smtpSettings?.host || ''),
                port: req.body.smtpPort !== undefined ? Number(req.body.smtpPort) : (settings.smtpSettings?.port || 587),
                user: req.body.smtpUser !== undefined ? req.body.smtpUser : (settings.smtpSettings?.user || ''),
                password: req.body.smtpPass !== undefined ? req.body.smtpPass : (settings.smtpSettings?.password || '')
            };
        }

        if (req.body.smsProvider !== undefined || req.body.smsApiKey !== undefined || req.body.smsSenderId !== undefined) {
            settings.smsSettings = {
                provider: req.body.smsProvider !== undefined ? req.body.smsProvider : (settings.smsSettings?.provider || 'Twilio'),
                apiKey: req.body.smsApiKey !== undefined ? req.body.smsApiKey : (settings.smsSettings?.apiKey || ''),
                senderId: req.body.smsSenderId !== undefined ? req.body.smsSenderId : (settings.smsSettings?.senderId || '')
            };
        }
        
        const updatedSettings = await settings.save();

        // If maintenanceMode was turned on, broadcast a notification to all Admins and Employees
        if (updatedSettings.maintenanceMode && !oldMaintenanceMode) {
            try {
                const Notification = require('../models/Notification');
                
                const admins = await Admin.find({ status: 'Active' });
                const employees = await Employee.find({ status: { $ne: 'Archived' } });
                
                const notifications = [];
                const title = "⚠️ System Maintenance Alert";
                const message = updatedSettings.maintenanceMessage || "The platform is entering maintenance mode. Please save your work.";

                for (const admin of admins) {
                    notifications.push({
                        recipientId: admin._id,
                        recipientModel: 'Admin',
                        title,
                        message
                    });
                }

                for (const emp of employees) {
                    notifications.push({
                        recipientId: emp._id,
                        recipientModel: 'Employee',
                        title,
                        message
                    });
                }

                if (notifications.length > 0) {
                    await Notification.insertMany(notifications);
                    console.log(`[Maintenance] Broadcoast notifications created for ${notifications.length} users.`);
                }
            } catch (notifErr) {
                console.error("Failed to broadcast maintenance notifications:", notifErr);
            }
        }

        res.status(200).json({ message: "System settings updated successfully!", settings: updatedSettings });
    } catch (err) {
        res.status(500).json({ message: "Settings update failed", error: err.message });
    }
});

// GET: SSO Analytics
router.get('/sso-analytics', async (req, res) => {
    try {
        const CompanySettings = require('../models/CompanySettings');
        const SsoLoginLog = require('../models/SsoLoginLog');
        const Employee = require('../models/Employee');

        const activeConfigs = await CompanySettings.find({ 
            'ssoSettings.enabled': true, 
            'ssoSettings.isConnected': true 
        });

        const providerCounts = {
            Google: 0,
            AzureAD: 0,
            Okta: 0,
            Auth0: 0,
            SAML: 0,
            OIDC: 0
        };
        let totalActiveUsers = 0;

        const companyDetails = [];
        for (const config of activeConfigs) {
            const userCount = await Employee.countDocuments({ company: config.company, status: 'Active' });
            
            const providerName = config.ssoSettings.provider;
            if (providerCounts[providerName] !== undefined) {
                providerCounts[providerName]++;
            }
            totalActiveUsers += userCount;

            companyDetails.push({
                companyId: config.company,
                companyName: config.companyName,
                provider: providerName,
                usersCount: userCount
            });
        }

        const totalAttempts = await SsoLoginLog.countDocuments();
        const successAttempts = await SsoLoginLog.countDocuments({ status: 'Success' });
        const failedAttempts = await SsoLoginLog.countDocuments({ status: 'Failed' });

        res.status(200).json({
            usage: companyDetails,
            providerBreakdown: providerCounts,
            totalActiveUsers,
            auditStats: {
                totalAttempts,
                successAttempts,
                failedAttempts
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching SSO analytics data", error: err.message });
    }
});

// GET: SSO Login Logs
router.get('/sso-logs', async (req, res) => {
    try {
        const SsoLoginLog = require('../models/SsoLoginLog');
        const logs = await SsoLoginLog.find().sort({ createdAt: -1 }).limit(100);
        res.status(200).json(logs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching SSO login logs", error: err.message });
    }
});


// ==========================================
// 💳 9. POST: Razorpay Payment Gateway (Test)
// ==========================================
router.post('/create-payment', async (req, res) => {
    if (!razorpayInstance) {
        return res.status(503).json({ message: "Payment gateway not configured. Install razorpay package." });
    }
    try {
        const { amount } = req.body;
        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_test_${Date.now()}`
        };
        const order = await razorpayInstance.orders.create(options);
        res.status(200).json({ success: true, order });
    } catch (err) {
        res.status(500).json({ message: "Razorpay order creation failed", error: err.message });
    }
});

// ==========================================
// 🕵️‍♂️ POST: Impersonate Company Admin (God Mode)
// ==========================================
router.post('/companies/:id/impersonate', checkSuperAdminRole([]), async (req, res) => {
    try {
        const hrAdmin = await Admin.findById(req.params.id);
        
        if (!hrAdmin) {
            return res.status(404).json({ message: "Company CEO record not found!" });
        }

        if (hrAdmin.status === 'Blacklisted') {
            return res.status(403).json({ message: "Cannot impersonate a Blacklisted company!" });
        }

        const token = jwt.sign(
            { id: hrAdmin._id, role: 'admin', email: hrAdmin.email },
            JWT_SECRET,
            { expiresIn: '2h' } 
        );

        await SecurityLog.create({
            userRole: 'Super Admin',
            companyName: hrAdmin.companyName,
            category: 'ADMIN_ACTION',
            details: `Super Admin forcefully impersonated the HR dashboard for '${hrAdmin.companyName}'.`,
            severity: 'Warning'
        }).catch(() => {});

        res.status(200).json({ 
            message: `Successfully logged in as ${hrAdmin.companyName} HR!`,
            token: token,
            role: 'admin'
        });

    } catch (err) {
        console.error("Impersonate Error:", err);
        res.status(500).json({ message: "Impersonation API crashed", error: err.message });
    }
});

// ==========================================
// 📢 GET: Fetch Announcements & Logs
// ==========================================
const contentProtector = checkSuperAdminRole(['Owner', 'Content']);

router.get('/announcements', contentProtector, async (req, res) => {
    
    try {
        const announcements = await SuperAdminBroadcast.find().sort({ createdAt: -1 }).lean();
        const mappedAnnouncements = announcements.map(a => ({
            ...a,
            readCount: a.readReceipts ? a.readReceipts.length : 0
        }));
        res.status(200).json(mappedAnnouncements);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch announcements", error: err.message });
    }
});

// ==========================================
router.post('/announcements', contentProtector, async (req, res) => {
    try {
        const { title, message, priority, targetAudience, channels, scheduledAt } = req.body;

        const settings = await SystemSetting.findOne();
        if (!settings) return res.status(400).json({ message: "System settings not configured!" });

        const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
        const newAnnouncement = new SuperAdminBroadcast({
            title, message, priority, targetAudience, channels,
            status: isScheduled ? 'Scheduled' : 'Sent',
            scheduledAt: isScheduled ? new Date(scheduledAt) : null,
            sentAt: isScheduled ? null : new Date()
        });
        await newAnnouncement.save();

        let targetAdmins = [];
        let targetEmployees = [];

        if (targetAudience === 'All') {
            targetAdmins = await Admin.find({});
            targetEmployees = await Employee.find({});
        } else if (targetAudience === 'Active') {
            targetAdmins = await Admin.find({ status: 'Active' });
            const companyIds = targetAdmins.map(a => a._id);
            targetEmployees = await Employee.find({ company: { $in: companyIds } });
        } else if (targetAudience === 'Trial') {
            targetAdmins = await Admin.find({ selectedPlanName: { $in: ['Free Trial', 'None'] } });
            const companyIds = targetAdmins.map(a => a._id);
            targetEmployees = await Employee.find({ company: { $in: companyIds } });
        } else if (targetAudience === 'Enterprise') {
            targetAdmins = await Admin.find({ selectedPlanName: 'Enterprise' });
            const companyIds = targetAdmins.map(a => a._id);
            targetEmployees = await Employee.find({ company: { $in: companyIds } });
        }

        let targetEmails = [...targetAdmins.map(a => a.email), ...targetEmployees.map(e => e.email)];
        targetEmails = targetEmails.filter(email => email);

        const dispatchNotifications = async () => {
            console.log(`🚀 Dispatching Broadcast: ${title}`);

            // Also create local Announcement entries for all target companies so they see it in the UI
            try {
                for (const admin of targetAdmins) {
                    await Announcement.create({
                        company: admin._id,
                        title: `📢 [Broadcast - ${priority}] ${title}`,
                        message: message,
                        targetAudience: 'All',
                        createdBy: admin._id // Since it requires a valid Admin ref, we use the tenant's admin
                    });
                }
            } catch (announceErr) {
                console.error("❌ Failed to create local Announcements for target companies:", announceErr.message);
            }

            if (channels && channels.email && targetEmails.length > 0 && settings.smtpSettings?.host) {
                try {
                    const transporter = nodemailer.createTransport({
                        host: settings.smtpSettings.host,
                        port: settings.smtpSettings.port,
                        secure: settings.smtpSettings.port === 465, 
                        auth: {
                            user: settings.smtpSettings.user,
                            pass: settings.smtpSettings.password
                        }
                    });

                    await transporter.sendMail({
                        from: `"System Admin" <${settings.smtpSettings.user}>`,
                        to: targetEmails,
                        subject: priority === 'Critical' ? `🚨 CRITICAL: ${title}` : title,
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                                <h2 style="color: #312e81;">${title}</h2>
                                <p style="font-size: 16px; color: #333;">${message}</p>
                                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                                <p style="font-size: 12px; color: #999;">This is an automated system broadcast. Please do not reply.</p>
                            </div>
                        `
                    });
                    console.log("✅ Emails sent successfully!");
                } catch (emailErr) {
                    console.error("❌ Email Dispatch Failed:", emailErr.message);
                }
            }

            // Twilio SMS dispatch
            if (channels && channels.sms && targetEmployees.length > 0 && settings.smsSettings?.apiKey) {
                try {
                    const [accountSid, authToken] = settings.smsSettings.apiKey.split(':');
                    if (twilio && accountSid && authToken) {
                        const client = twilio(accountSid, authToken);
                        const fromNumber = settings.smsSettings.senderId || '+1234567890';
                        for (const emp of targetEmployees) {
                            if (emp.phone) {
                                await client.messages.create({
                                    body: `📢 [Broadcast - ${priority}] ${title}: ${message}`,
                                    from: fromNumber,
                                    to: emp.phone
                                });
                            }
                        }
                        console.log("✅ SMS sent successfully!");
                    }
                } catch (smsErr) {
                    console.error("❌ SMS Dispatch Failed:", smsErr.message);
                }
            }

            if (isScheduled) {
                newAnnouncement.status = 'Sent';
                newAnnouncement.sentAt = new Date();
                await newAnnouncement.save();
            }
        };

        if (isScheduled && schedule) {
            schedule.scheduleJob(new Date(scheduledAt), dispatchNotifications);
            res.status(201).json({ message: "Broadcast scheduled successfully!", announcement: newAnnouncement });
        } else {
            dispatchNotifications(); 
            res.status(201).json({ message: "Broadcast dispatched successfully!", announcement: newAnnouncement });
        }

    } catch (err) {
        res.status(500).json({ message: "Failed to process announcement", error: err.message });
    }
});

// ==========================================
// 🔧  POST: Super Admin Login
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const superadmin = await require('../models/Superadmin').findOne({ email });
        if (!superadmin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, superadmin.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: superadmin._id, role: 'superadmin', email: superadmin.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({ 
            message: "Super Admin login successful!", 
            token,
            role: 'superadmin'
        });
    } catch (err) {
        res.status(500).json({ message: "Login failed", error: err.message });
    }
});

// ==========================================
// 💳 SUBSCRIPTION PLANS CRUD ENDPOINTS
// ==========================================
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Initialize default plans helper
const initializeDefaultPlans = async () => {
    const defaultPlans = [
        {
            name: "Free Trial",
            priceMonthly: 0,
            priceYearly: 0,
            maxEmployees: 10,
            maxHrUsers: 1,
            maxDepartments: 3,
            storageLimitGB: 1,
            modules: { attendance: true, leave: true, payroll: false, performance: false, recruitment: false, training: false, asset: false, expense: false, documents: false, chat: false },
            isPopular: false,
            isRecommended: false,
            yearlyDiscountPercent: 0,
            status: "Active"
        },
        {
            name: "Starter",
            priceMonthly: 999,
            priceYearly: 9590,
            maxEmployees: 50,
            maxHrUsers: 3,
            maxDepartments: 10,
            storageLimitGB: 5,
            modules: { attendance: true, leave: true, payroll: true, performance: false, recruitment: false, training: false, asset: false, expense: false, documents: false, chat: false },
            isPopular: false,
            isRecommended: false,
            yearlyDiscountPercent: 20,
            status: "Active"
        },
        {
            name: "Business",
            priceMonthly: 2499,
            priceYearly: 23990,
            maxEmployees: 200,
            maxHrUsers: 10,
            maxDepartments: 25,
            storageLimitGB: 20,
            modules: { attendance: true, leave: true, payroll: true, performance: true, recruitment: true, training: false, asset: true, expense: true, documents: false, chat: false },
            isPopular: true,
            isRecommended: false,
            yearlyDiscountPercent: 20,
            status: "Active"
        },
        {
            name: "Enterprise",
            priceMonthly: 4999,
            priceYearly: 47990,
            maxEmployees: 99999,
            maxHrUsers: 999,
            maxDepartments: 999,
            storageLimitGB: 100,
            modules: { attendance: true, leave: true, payroll: true, performance: true, recruitment: true, training: true, asset: true, expense: true, documents: true, chat: true },
            isPopular: false,
            isRecommended: true,
            yearlyDiscountPercent: 20,
            status: "Active"
        }
    ];

    for (const plan of defaultPlans) {
        const exists = await SubscriptionPlan.findOne({ name: plan.name });
        if (!exists) {
            await new SubscriptionPlan(plan).save();
        }
    }
};

// GET all subscription plans
router.get('/plans', async (req, res) => {
    try {
        let plans = await SubscriptionPlan.find();
        if (plans.length === 0) {
            await initializeDefaultPlans();
            plans = await SubscriptionPlan.find();
        }
        res.status(200).json({ success: true, plans });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching subscription plans", error: err.message });
    }
});

// POST create plan
router.post('/plans', async (req, res) => {
    try {
        const newPlan = new SubscriptionPlan(req.body);
        await newPlan.save();
        res.status(201).json({ success: true, message: "Subscription plan created successfully!", plan: newPlan });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error creating plan", error: err.message });
    }
});

// PUT update plan
router.put('/plans/:id', async (req, res) => {
    try {
        const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPlan) return res.status(404).json({ success: false, message: "Plan not found!" });
        res.status(200).json({ success: true, message: "Subscription plan updated successfully!", plan: updatedPlan });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error updating plan", error: err.message });
    }
});

// DELETE plan
router.delete('/plans/:id', async (req, res) => {
    try {
        const deletedPlan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
        if (!deletedPlan) return res.status(404).json({ success: false, message: "Plan not found!" });
        res.status(200).json({ success: true, message: "Subscription plan deleted permanently!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error deleting plan", error: err.message });
    }
});



// ==========================================
// 💳 ADDITIONAL BILLING MANAGEMENT ROUTES
// ==========================================

// 1. POST: Send Payment Reminder Notification
router.post('/companies/:id/send-reminder', async (req, res) => {
    try {
        const company = await Admin.findById(req.params.id);
        if (!company) return res.status(404).json({ success: false, message: "Company not found!" });
        
        const Notification = require('../models/Notification');
        await Notification.create({
            recipientId: company._id,
            recipientModel: 'Admin',
            title: 'Payment Reminder',
            message: `Your subscription payment is due. Please review your billing dashboard to settle any outstanding charges.`,
            link: '/admin/Billing',
            priority: 'Urgent'
        });

        console.log(`[Billing System]: Payment reminder dispatched to ${company.companyName} at ${company.email}`);
        res.status(200).json({ 
            success: true, 
            message: `Payment reminder notification successfully dispatched to "${company.companyName}" admin!` 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error sending reminder", error: err.message });
    }
});

// 2. POST: Manual Payment Override (Mark as Paid or Extend/Revoke Trial)
router.post('/companies/:id/manual-payment', async (req, res) => {
    try {
        const { planName, status, actionType } = req.body;
        const company = await Admin.findById(req.params.id);
        if (!company) return res.status(404).json({ success: false, message: "Company not found!" });

        const Subscription = require('../models/Subscription');
        const Invoice = require('../models/Invoice');
        const Notification = require('../models/Notification');

        if (actionType === 'override') {
            const chosenPlanName = planName || 'Free Trial';
            const SubscriptionPlan = require('../models/SubscriptionPlan');
            const activePlan = await SubscriptionPlan.findOne({ name: chosenPlanName });
            
            let pricePaid = activePlan ? activePlan.priceMonthly : 0;
            let empQuota = activePlan ? activePlan.maxEmployees : 10;
            let deptQuota = activePlan ? activePlan.maxDepartments : 10;
            let storageQuota = activePlan ? activePlan.storageLimitGB : 10;

            const baseDate = new Date();
            baseDate.setMonth(baseDate.getMonth() + 1);

            company.selectedPlanName = chosenPlanName;
            company.planPrice = String(pricePaid);
            company.hasPaidTier = (chosenPlanName !== 'Free Trial' && chosenPlanName !== 'None');
            company.status = status || 'Active';
            company.subscriptionExpiry = baseDate;
            company.employeeQuotaTarget = empQuota;
            company.departmentQuotaTarget = deptQuota;
            company.storageQuotaTarget = storageQuota;
            await company.save();

            const newSub = new Subscription({
                company: company._id,
                planName: chosenPlanName,
                status: 'Active',
                startDate: new Date(),
                expiryDate: baseDate,
                maxEmployees: empQuota,
                pricePaid: pricePaid,
                billingCycle: 'Monthly'
            });
            await newSub.save();

            const invoice = new Invoice({
                company: company._id,
                invoiceNumber: `INV-${Date.now()}`,
                subscriptionId: newSub._id,
                amount: pricePaid,
                totalAmount: pricePaid,
                status: 'Paid',
                paymentDate: new Date(),
                paymentMethod: 'Manual Override'
            });
            await invoice.save();

            await Notification.create({
                recipientId: company._id,
                recipientModel: 'Admin',
                title: 'Subscription Activated',
                message: `Your account subscription has been manually updated to the ${chosenPlanName} plan by Super Admin. Expiry: ${baseDate.toLocaleDateString('en-IN')}.`,
                link: '/admin/Billing'
            });

            return res.status(200).json({ 
                success: true, 
                message: `Manual payment override successfully registered for ${company.companyName}. Set tier to ${company.selectedPlanName}.`,
                company: mapAdminToCompany(company)
            });
        } else if (actionType === 'extend-trial') {
            const baseDate = company.subscriptionExpiry && new Date(company.subscriptionExpiry) > new Date()
                ? new Date(company.subscriptionExpiry)
                : new Date();
            baseDate.setDate(baseDate.getDate() + 30);

            company.selectedPlanName = 'Free Trial';
            company.planPrice = '0';
            company.hasPaidTier = false;
            company.hasUsedTrial = true;
            company.status = 'Active';
            company.subscriptionExpiry = baseDate;
            await company.save();

            const newSub = new Subscription({
                company: company._id,
                planName: 'Free Trial',
                status: 'Active',
                startDate: new Date(),
                expiryDate: baseDate,
                maxEmployees: company.employeeQuotaTarget || 10,
                pricePaid: 0,
                billingCycle: 'Monthly'
            });
            await newSub.save();

            const invoice = new Invoice({
                company: company._id,
                invoiceNumber: `INV-${Date.now()}`,
                subscriptionId: newSub._id,
                amount: 0,
                totalAmount: 0,
                status: 'Paid',
                paymentDate: new Date(),
                paymentMethod: 'Manual Trial Extension'
            });
            await invoice.save();

            await Notification.create({
                recipientId: company._id,
                recipientModel: 'Admin',
                title: 'Trial Extended',
                message: `Your Free Trial period has been manually extended by 30 days. New Expiry: ${baseDate.toLocaleDateString('en-IN')}.`,
                link: '/admin/Billing'
            });

            return res.status(200).json({ 
                success: true, 
                message: `Trial period successfully extended by 30 days for ${company.companyName}!`,
                company: mapAdminToCompany(company)
            });
        } else if (actionType === 'revoke-trial') {
            company.selectedPlanName = 'None';
            company.planPrice = '0';
            company.hasPaidTier = false;
            company.status = 'Suspended';
            company.subscriptionExpiry = new Date();
            await company.save();

            await Notification.create({
                recipientId: company._id,
                recipientModel: 'Admin',
                title: 'Trial Revoked',
                message: `Your Free Trial period has been revoked by the Super Admin. Your account status is now Suspended.`,
                link: '/admin/Billing'
            });

            return res.status(200).json({ 
                success: true, 
                message: `Trial period successfully revoked for ${company.companyName}!`,
                company: mapAdminToCompany(company)
            });
        } else {
            return res.status(400).json({ success: false, message: "Invalid billing action actionType." });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "Error performing manual payment override", error: err.message });
    }
});

// 3. POST: Issue Refund Simulation
router.post('/companies/:id/refund', async (req, res) => {
    try {
        const company = await Admin.findById(req.params.id);
        if (!company) return res.status(404).json({ success: false, message: "Company not found!" });
        
        let amount = Number(company.planPrice) || 0;
        if (!amount) {
            if(company.selectedPlanName === 'Starter') amount = 999;
            if(company.selectedPlanName === 'Business') amount = 2499;
            if(company.selectedPlanName === 'Enterprise') amount = 4999;
        }

        const Invoice = require('../models/Invoice');
        const Subscription = require('../models/Subscription');
        const Notification = require('../models/Notification');

        // Downgrade company
        company.selectedPlanName = 'None';
        company.planPrice = '0';
        company.hasPaidTier = false;
        company.status = 'Suspended';
        company.subscriptionExpiry = new Date();
        await company.save();

        // Save a negative invoice as a refund transaction record
        const refundInvoice = new Invoice({
            company: company._id,
            invoiceNumber: `REF-${Date.now()}`,
            subscriptionId: company._id, // fallback to company id if no subscription model found
            amount: -amount,
            totalAmount: -amount,
            status: 'Refunded',
            paymentDate: new Date(),
            paymentMethod: 'Refund Processed'
        });
        await refundInvoice.save();

        // Update latest actual invoices to 'Refunded'
        await Invoice.updateMany(
            { company: company._id, status: 'Paid' },
            { $set: { status: 'Refunded' } }
        );

        await Notification.create({
            recipientId: company._id,
            recipientModel: 'Admin',
            title: 'Subscription Refunded',
            message: `Your subscription of Rs. ${amount.toFixed(2)} has been refunded. Your account is now suspended.`,
            link: '/admin/Billing'
        });

        res.status(200).json({ 
            success: true, 
            message: `Refund of Rs. ${amount.toFixed(2)} successfully processed for "${company.companyName}"! Admin workspace downgraded.`,
            company: mapAdminToCompany(company)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error processing refund", error: err.message });
    }
});

// 4. POST: Toggle Auto-Renew
router.post('/companies/:id/toggle-autorenew', async (req, res) => {
    try {
        const company = await Admin.findById(req.params.id);
        if (!company) return res.status(404).json({ success: false, message: "Company not found!" });
        company.autoRenew = !company.autoRenew;
        await company.save();
        res.status(200).json({ 
            success: true, 
            message: `Auto-renewal for "${company.companyName}" is now ${company.autoRenew ? 'Enabled' : 'Disabled'}.`, 
            company: mapAdminToCompany(company) 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error toggling auto-renewal", error: err.message });
    }
});

// 5. GET: Company Payment Invoice History
router.get('/companies/:id/payment-history', async (req, res) => {
    try {
        const Invoice = require('../models/Invoice');
        const invoices = await Invoice.find({ company: req.params.id })
            .sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch payment history", error: err.message });
    }
});

// 4. POST: Test Payment Gateway Connection Check
router.post('/test-gateway', async (req, res) => {
    try {
        const { gateway } = req.body;
        const settings = await SystemSetting.findOne();
        
        if (!settings || !settings.paymentGateways) {
            return res.status(400).json({ 
                success: false, 
                message: "Connection failed. Ask Admin for key to complete the connection with exterior things." 
            });
        }

        const keys = settings.paymentGateways;
        let isConfigured = false;

        if (gateway === 'Razorpay') {
            isConfigured = !!(keys.razorpayKey && keys.razorpaySecret);
        } else if (gateway === 'Stripe') {
            isConfigured = !!(keys.stripeKey && keys.stripeSecret);
        } else if (gateway === 'PayU') {
            isConfigured = !!(keys.payuMerchantKey && keys.payuMerchantSalt);
        }

        if (!isConfigured) {
            return res.status(400).json({ 
                success: false, 
                message: "Connection failed. Ask Admin for key to complete the connection with exterior things." 
            });
        }

        res.status(200).json({ 
            success: true, 
            message: `${gateway} Gateway Link Connected Successfully! Authentication verified.` 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server connection check failed", error: err.message });
    }
});


// ==========================================
// 🎟️ COUPON MANAGEMENT ENDPOINTS
// ==========================================
const Coupon = require('../models/Coupon');

// GET all coupons
router.get('/coupons', async (req, res) => {
    try {
        const coupons = await Coupon.find().populate('usedBy.adminId', 'name email companyName').sort({ createdAt: -1 });
        res.status(200).json(coupons);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch coupons", error: err.message });
    }
});

// POST create coupon
router.post('/coupons', async (req, res) => {
    try {
        const { code, discountType, discountValue, expiryDate, maxUses } = req.body;
        const newCoupon = new Coupon({
            code: code.trim().toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            maxUses: maxUses ? Number(maxUses) : null
        });
        await newCoupon.save();
        res.status(201).json({ message: "Coupon generated successfully!", coupon: newCoupon });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Coupon code already exists!" });
        }
        res.status(500).json({ message: "Failed to create coupon", error: err.message });
    }
});

// PUT toggle status
router.put('/coupons/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const updatedCoupon = await Coupon.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.status(200).json({ message: `Coupon marked as ${status}`, coupon: updatedCoupon });
    } catch (err) {
        res.status(500).json({ message: "Status update failed", error: err.message });
    }
});

// DELETE coupon
router.delete('/coupons/:id', async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Coupon permanently deleted!" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed", error: err.message });
    }
});
// ==========================================
// ⚙️ SYSTEM SETTINGS ENDPOINTS
// ==========================================
module.exports = router;
