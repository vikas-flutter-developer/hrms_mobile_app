const mongoose = require('mongoose');
require('dotenv').config();

const Ticket = require('./models/Ticket');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Superadmin = require('./models/Superadmin');
const SecurityLog = require('./models/SecurityLog');
const IpRule = require('./models/IpRule');
const UserSession = require('./models/UserSession');

async function seed() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error("❌ MONGO_URI not found in env variables!");
        process.exit(1);
    }
    
    await mongoose.connect(MONGO_URI);
    console.log("💾 Connected securely to MongoDB database.");

    // 1. Clean old dummy records
    await Ticket.deleteMany({});
    await SecurityLog.deleteMany({});
    await IpRule.deleteMany({});
    await UserSession.deleteMany({});
    console.log("🧹 Flushed legacy mock and garbage records.");

    // 2. Fetch references
    const admin = await Admin.findOne({});
    const employee = await Employee.findOne({});
    const superadmin = await Superadmin.findOne({});

    if (!admin) {
        console.error("❌ No Admin found in corporate collection to relate company assets!");
        process.exit(1);
    }
    
    const empId = employee ? employee._id : admin._id;
    const empModel = employee ? 'Employee' : 'Admin';
    const saId = superadmin ? superadmin._id : new mongoose.Types.ObjectId();
    const saName = superadmin ? superadmin.name : "Platform Owner";

    // 3. Seed Support Tickets Desk
    const tickets = [
        {
            company: admin._id,
            employeeId: empId,
            employeeModel: empModel,
            isSuperAdminTicket: true,
            subject: "Unable to generate payslips for June cohort list",
            category: "Payroll Query",
            description: "When compiling the payroll list for the June 2026 period, the system halts at 84% generation and returns a runtime calculation timeout error. Please advise.",
            priority: "High",
            status: "Resolved",
            assignedTo: saId,
            resolvedAt: new Date(Date.now() - 4 * 3600000),
            thread: [
                {
                    senderId: empId,
                    senderModel: empModel,
                    message: "Hi support, we are trying to finalize June payroll before the 5th, but the batch generation keeps failing. Log attached shows database thread locked.",
                    timestamp: new Date(Date.now() - 8 * 3600000)
                },
                {
                    senderId: saId,
                    senderModel: "Superadmin",
                    message: "Hello corporate Admin. We inspected your workspace registry and found that two custom designation codes had overlapping tax deduction formulas. I have normalized the tier deduction formulas on your account settings. Could you try generating the cohort batch now?",
                    timestamp: new Date(Date.now() - 6 * 3600000)
                },
                {
                    senderId: empId,
                    senderModel: empModel,
                    message: "Perfect! It worked instantly and generated all 45 payslips. Resolved. Thank you for the quick SLA response.",
                    timestamp: new Date(Date.now() - 4 * 3600000)
                }
            ]
        },
        {
            company: admin._id,
            employeeId: empId,
            employeeModel: empModel,
            isSuperAdminTicket: true,
            subject: "Attendance clock-in showing incorrect time zone offsets",
            category: "IT Support",
            description: "Employees based in our APAC branch are reporting that their clock-in logs show a GMT-5 offset (US Eastern) instead of GMT+5:30. This is throwing off their daily shift status metrics.",
            priority: "Medium",
            status: "In Progress",
            assignedTo: saId,
            thread: [
                {
                    senderId: empId,
                    senderModel: empModel,
                    message: "APAC branch check-in times are being pushed into the database using default server time instead of client localization settings. Pls fix.",
                    timestamp: new Date(Date.now() - 12 * 3600000)
                },
                {
                    senderId: saId,
                    senderModel: "Superadmin",
                    message: "Thanks for raising this. We are currently looking into our socket-service middleware. The server timezone defaults to UTC, and we need to deploy timezone overrides in the upcoming client build. I will update you as soon as the patch is ready.",
                    timestamp: new Date(Date.now() - 10 * 3600000)
                }
            ]
        },
        {
            company: admin._id,
            employeeId: empId,
            employeeModel: empModel,
            isSuperAdminTicket: true,
            subject: "Requesting storage tier upgrade to Enterprise 50GB",
            category: "Billing Request",
            description: "Our company is quickly running out of document vault storage. We have uploaded several corporate training video logs and compliance archives. Please upgrade our plan tier.",
            priority: "Low",
            status: "Open",
            assignedTo: null,
            thread: [
                {
                    senderId: empId,
                    senderModel: empModel,
                    message: "Hi, our compliance audit is starting next week and we need to upload several Gigabytes of training records. Please upgrade our workspace limit.",
                    timestamp: new Date(Date.now() - 2 * 3600000)
                }
            ]
        },
        {
            company: admin._id,
            employeeId: empId,
            employeeModel: empModel,
            isSuperAdminTicket: true,
            subject: "SSO Login integration failing with Google authentication redirect loop",
            category: "Integration Error",
            description: "Whenever employees try logging in via the Google Sign-In redirect option, they are thrown into an authentication redirect loop. The console displays a CORS callback policy error.",
            priority: "Urgent",
            status: "Open",
            isEscalated: true,
            assignedTo: null,
            thread: [
                {
                    senderId: empId,
                    senderModel: empModel,
                    message: "Critical issue: None of our remote employees can log in because of the SSO loop callback restriction.",
                    timestamp: new Date(Date.now() - 1 * 3600000)
                }
            ]
        }
    ];
    await Ticket.insertMany(tickets);
    console.log("🎫 Support desk tickets successfully seeded.");

    // 4. Seed Firewall Rules
    const ipRules = [
        { ipAddress: "198.51.100.42", ruleType: "Blacklist", reason: "Repeated API rate limit breach and brute-force scans." },
        { ipAddress: "203.0.113.195", ruleType: "Blacklist", reason: "Suspicious login redirects from non-operational region." },
        { ipAddress: "103.45.67.89", ruleType: "Whitelist", reason: "Company head office dedicated fiber proxy IP." },
        { ipAddress: "192.168.10.4", ruleType: "Whitelist", reason: "Internal gateway developer sandbox endpoint." }
    ];
    await IpRule.insertMany(ipRules);
    console.log("🛡️ Firewall IP whitelist/blacklist rules seeded.");

    // 5. Seed Security Audit Logs
    const securityLogs = [
        {
            userEmail: "owner@hrms.com",
            userRole: "superadmin",
            companyName: "Global HQ",
            category: "IP_RULE_CHANGE",
            details: "Blacklisted IP block range 198.51.100.42 due to repeated telemetry spikes.",
            ipAddress: "103.45.67.89",
            deviceInfo: "Chrome / Windows 11",
            severity: "Warning",
            apiRoute: "/api/security/ip-rules"
        },
        {
            userEmail: "anonymous@guest.com",
            userRole: "Guest",
            companyName: "Google Dev Corp",
            category: "LOGIN_FAILED",
            details: "Failed password attempts (5 attempts) for corporate HR Admin account.",
            ipAddress: "45.33.22.11",
            deviceInfo: "Safari / Mac OS X",
            severity: "Critical",
            apiRoute: "/api/auth/login"
        },
        {
            userEmail: "billing@hrms.com",
            userRole: "superadmin",
            companyName: "Global HQ",
            category: "DATA_EXPORT",
            details: "SuperAdmin exported database JSON configuration backup.",
            ipAddress: "103.45.67.89",
            deviceInfo: "Firefox / Linux",
            severity: "Info",
            apiRoute: "/api/data-management/export-json"
        },
        {
            userEmail: admin.email,
            userRole: "admin",
            companyName: admin.companyName,
            category: "ADMIN_ACTION",
            details: `Admin changed designations hierarchy settings in department ledger.`,
            ipAddress: "192.168.1.5",
            deviceInfo: "Chrome / Android 14",
            severity: "Info",
            apiRoute: "/api/designations"
        }
    ];
    await SecurityLog.insertMany(securityLogs);
    console.log("📜 Security audit log archives populated.");

    // 6. Seed User Active Sessions
    const sessions = [
        {
            userId: admin._id.toString(),
            userName: admin.name,
            userEmail: admin.email,
            userRole: "admin",
            companyName: admin.companyName,
            ipAddress: "192.168.1.5",
            deviceInfo: "Android Emulator / Chrome",
            isActive: true
        },
        {
            userId: empId.toString(),
            userName: employee ? employee.name : "Platform Executive",
            userEmail: employee ? employee.email : "exec@hrms.com",
            userRole: employee ? "employee" : "admin",
            companyName: admin.companyName,
            ipAddress: "102.34.12.98",
            deviceInfo: "Flutter Mobile / iOS 17",
            isActive: true
        },
        {
            userId: saId.toString(),
            userName: saName,
            userEmail: superadmin ? superadmin.email : "owner@hrms.com",
            userRole: "superadmin",
            companyName: "Global HQ",
            ipAddress: "103.45.67.89",
            deviceInfo: "Chrome / Windows 11",
            isActive: true
        }
    ];
    await UserSession.insertMany(sessions);
    console.log("🔌 Active user login sessions seeded.");

    console.log("🎉 Seeding complete! Database is populated with premium sample data.");
    mongoose.disconnect();
}

seed().catch(err => {
    console.error("❌ Seeding execution error:", err);
    process.exit(1);
});
