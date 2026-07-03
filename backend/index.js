// ==========================================
// 📦 CORE MODULE IMPORTS
// ==========================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config({ override: true });

// ==========================================
// 🚀 APP INITIALIZATION
// ==========================================
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => callback(null, true),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
});

const PORT = process.env.PORT || 5000;
const Employee = require('./models/Employee');
const Admin = require('./models/Admin');
const nodemailer = require('nodemailer');

// ==========================================
// 🛡️ GLOBAL MIDDLEWARE LAYER REGISTER
// ==========================================
app.use(cors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ⚙️ GLOBAL APP VERSION & MAINTENANCE MODE HEADERS
const SystemSetting = require('./models/SystemSetting');
app.use(async (req, res, next) => {
    try {
        const settings = await SystemSetting.findOne();
        if (settings) {
            res.setHeader('X-App-Version', settings.appVersion || '1.0.0');
            res.setHeader('X-Force-Update', settings.forceUpdate ? 'true' : 'false');
        }
    } catch (e) {
        console.error("Error setting version headers:", e);
    }
    next();
});

// ⚙️ GLOBAL FEATURE FLAG OVERRIDES MIDDLEWARE
app.use(async (req, res, next) => {
    const apiPath = req.path;
    const routeFeatureMap = [
        { prefix: '/api/attendance', key: 'attendance', label: 'Attendance' },
        { prefix: '/api/leaves', key: 'leave', label: 'Leave' },
        { prefix: '/api/leave-policies', key: 'leave', label: 'Leave' },
        { prefix: '/api/payroll', key: 'payroll', label: 'Payroll' },
        { prefix: '/api/performance', key: 'performance', label: 'Performance' },
        { prefix: '/api/recruitment', key: 'recruitment', label: 'Recruitment' },
        { prefix: '/api/training', key: 'training', label: 'Training' },
        { prefix: '/api/assets', key: 'asset', label: 'Asset Management' },
        { prefix: '/api/expenses', key: 'expense', label: 'Expense Tracking' },
        { prefix: '/api/documents', key: 'document', label: 'Document Vault' },
        { prefix: '/api/messages', key: 'chat', label: 'Global Chat' },
        { prefix: '/api/announcements', key: 'announcements', label: 'Announcements' },
    ];

    const matched = routeFeatureMap.find(f => apiPath.startsWith(f.prefix));
    if (matched) {
        try {
            const settings = await SystemSetting.findOne();
            if (settings && settings.modules && settings.modules[matched.key] === false) {
                return res.status(403).json({ message: `${matched.label} module is globally disabled by the System Administrator.` });
            }
        } catch (e) {
            console.error("Error verifying feature flag status:", e);
        }
    }
    next();
});

// ⚙️ GLOBAL MAINTENANCE MODE MIDDLEWARE
app.use(async (req, res, next) => {
    const apiPath = req.path;

    // Skip super admin dashboard and console endpoints
    if (
        apiPath.startsWith('/api/superadmin') || 
        apiPath.startsWith('/api/super-admin') || 
        apiPath.startsWith('/api/rbac') || 
        apiPath.startsWith('/api/security') || 
        apiPath.startsWith('/api/master-data') || 
        apiPath.startsWith('/api/hr-oversight') || 
        apiPath.startsWith('/api/data-management') || 
        apiPath.startsWith('/api/integrations') || 
        apiPath.startsWith('/api/reports') || 
        apiPath.startsWith('/api/notifications')
    ) {
        return next();
    }

    try {
        const settings = await SystemSetting.findOne();
        if (settings && settings.maintenanceMode) {
            // Extract role from token to allow superadmin access
            let userRole = null;
            const authHeader = req.headers['authorization'];
            const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;
            if (token) {
                try {
                    const jwt = require('jsonwebtoken');
                    const verified = jwt.verify(token, process.env.JWT_SECRET || "HRMS_SUPER_SECRET_KEY@_123");
                    userRole = verified.role;
                } catch (e) {}
            }

            // Always allow superadmin
            if (userRole === 'superadmin') {
                return next();
            }

            // If it's a login attempt, verify role in the body
            if (apiPath === '/api/auth/login') {
                const role = req.body?.role?.trim()?.toLowerCase();
                if (role === 'superadmin') {
                    return next();
                } else if (settings.maintenanceType === 'Full') {
                    return res.status(503).json({ message: settings.maintenanceMessage || 'System is currently undergoing scheduled maintenance. Please check back soon.' });
                } else {
                    return next();
                }
            }

            // Under Full maintenance mode, block all access
            if (settings.maintenanceType === 'Full') {
                return res.status(503).json({ message: settings.maintenanceMessage || 'System is currently undergoing scheduled maintenance. Please check back soon.' });
            }

            // Under Partial maintenance mode, block all POST, PUT, DELETE, PATCH requests
            if (settings.maintenanceType === 'Partial') {
                if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                    return res.status(503).json({ message: settings.maintenanceMessage || 'System is currently undergoing scheduled maintenance. Write operations are disabled.' });
                }
            }
        }
    } catch (err) {
        console.error("Maintenance Mode Middleware error:", err);
    }

    next();
});

// ==========================================================
// 🎂 BIRTHDAY CRON JOB
// ==========================================
// Run every day at 00:00 (Midnight)
cron.schedule('0 0 * * *', async () => {
    console.log("Running daily birthday check...");
    try {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        // MongoDB aggregation to match day and month of birth
        const birthdayEmployees = await Employee.aggregate([
            {
                $project: {
                    name: 1,
                    company: 1,
                    dob: 1,
                    month: { $month: "$dob" },
                    day: { $dayOfMonth: "$dob" },
                    status: 1
                }
            },
            {
                $match: {
                    month: currentMonth,
                    day: currentDay,
                    status: { $ne: 'Archived' }
                }
            }
        ]);

        if (birthdayEmployees.length > 0) {
            const Announcement = require('./models/Announcement');
            for (const emp of birthdayEmployees) {
                const newAnnouncement = new Announcement({
                    company: emp.company,
                    title: '🎂 Happy Birthday!',
                    message: `Today is ${emp.name}'s birthday! Let's wish them a fantastic day! 🎉`,
                    targetAudience: 'All',
                    createdBy: emp.company // Admin ID
                });
                await newAnnouncement.save();
                console.log(`Birthday announcement created for ${emp.name}`);
            }
        }
    } catch (err) {
        console.error("Error running birthday cron job:", err);
    }
});

// ==========================================
// 💾 DATABASE PIPELINE INITIALIZATION
// ==========================================
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ [Database Config]: MONGO_URI is not set. Please set it to your MongoDB Atlas connection string in backend/.env.');
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("💾 [Database Status]: MongoDB pipeline securely connected.");

        // Drop legacy global index on empId if it exists to support multi-tenancy correctly
        try {
            await mongoose.connection.collection('employees').dropIndex('empId_1');
            console.log("🧹 Dropped legacy global unique index 'empId_1' from employees collection.");
        } catch (e) {
            if (e.codeName !== 'IndexNotFound') {
                console.warn("⚠️ Warning checking/dropping legacy global index 'empId_1':", e.message);
            }
        }

        const cleanupArchivedEmployees = async () => {
            try {
                const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const result = await Employee.deleteMany({
                    status: 'Archived',
                    $or: [
                        { archivedAt: { $lte: threshold } },
                        { archivedAt: null, updatedAt: { $lte: threshold } }
                    ]
                });

                if (result.deletedCount > 0) {
                    console.log(`🧹 Auto-cleaned ${result.deletedCount} archived employee(s) older than 24 hours.`);
                }
            } catch (cleanupErr) {
                console.error("Archive cleanup error:", cleanupErr);
            }
        };

        await cleanupArchivedEmployees();
        setInterval(cleanupArchivedEmployees, 60 * 60 * 1000);

        // ==========================================
        // ⏰ CRON SCHEDULER: Weekly Reports
        // ==========================================
        cron.schedule('0 8 * * 1', async () => {
            // Runs every Monday at 8:00 AM
            console.log('⏰ Running weekly scheduled auto-report...');
            try {
                const totalActive = await Employee.countDocuments({ status: 'Active' });
                // Future Implementation: Send email to admin via Nodemailer
                console.log(`📊 Scheduled Report: Total Active Employees = ${totalActive}`);
            } catch (err) {
                console.error('Cron Report Error:', err);
            }
        });

        // ==========================================
        // ⏰ CRON SCHEDULER: Subscription Expiry Reminders
        // ==========================================
        cron.schedule('0 9 * * *', async () => {
            // Runs every day at 9:00 AM
            console.log('⏰ Checking subscription expiry reminders...');
            try {
                const admin = await Admin.findOne();
                if (!admin || !admin.subscriptionExpiry || !admin.smtpSettings?.host) return;

                const expiryDate = new Date(admin.subscriptionExpiry);
                const today = new Date();
                const diffTime = expiryDate - today;
                const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if ([7, 3, 1].includes(daysLeft)) {
                    console.log(`⚠️ Subscription expires in ${daysLeft} days! Sending email...`);
                    
                    const transporter = nodemailer.createTransport({
                        host: admin.smtpSettings.host,
                        port: admin.smtpSettings.port,
                        secure: admin.smtpSettings.port == 465, // true for 465, false for other ports
                        auth: {
                            user: admin.smtpSettings.user,
                            pass: admin.smtpSettings.pass
                        }
                    });

                    const mailOptions = {
                        from: `"HRMS System" <${admin.smtpSettings.user}>`,
                        to: admin.email,
                        subject: `🚨 Urgent: Subscription Expires in ${daysLeft} Days`,
                        html: `
                            <div style="font-family: Arial, sans-serif; padding: 20px; background: #f8fafc; border-radius: 10px;">
                                <h2 style="color: #0f172a;">Subscription Renewal Reminder</h2>
                                <p style="color: #334155; font-size: 16px;">
                                    Dear ${admin.name},<br><br>
                                    Your HRMS system subscription for <strong>${admin.companyName}</strong> is expiring in <strong>${daysLeft} days</strong> (on ${expiryDate.toLocaleDateString()}).
                                </p>
                                <p style="color: #334155; font-size: 16px;">
                                    Please log in to your Admin Profile to renew your subscription and avoid any service interruptions.
                                </p>
                                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                                <p style="color: #64748b; font-size: 12px;">This is an automated notification from your HRMS platform.</p>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    console.log(`📧 Expiry reminder email sent successfully to ${admin.email}`);
                }
            } catch (err) {
                console.error('Cron Subscription Reminder Error:', err);
            }
        });

    })
    .catch((err) => {
        console.error("❌ Database connection critical drop:", err.message);
        process.exit(1);
    });

// ==========================================
// 📋 ROUTE ROUTING ENGINE IMPORTS
// ==========================================
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const customRoleRoutes = require('./routes/roles');        // CustomRole model (Designations)
const standardDesignationRoutes = require('./routes/designations'); // Designation model (Roles)

const employeeRoutes = require('./routes/employees');
const leaveRoutes = require('./routes/leaves');
const leavePolicyRoutes = require('./routes/leavePolicies');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes = require('./routes/dashboard');
const vacancyRoutes = require('./routes/vacancy');
const payrollRoutes = require('./routes/payrolls');

// ✅ NEW: Imported the recruitment route
const recruitmentRoutes = require('./routes/recruitment');
const performanceRoutes = require('./routes/performance');
const trainingRoutes = require('./routes/training');
const feedback360Routes = require('./routes/feedback360');

const assetRoutes = require('./routes/assets');
const expenseRoutes = require('./routes/expenses');
const documentRoutes = require('./routes/documents');
const helpdeskRoutes = require('./routes/helpdesk');
const announcementRoutes = require('./routes/announcements');
const complianceRoutes = require('./routes/compliance');
const reportsRoutes = require('./routes/reports');
const eventRoutes = require('./routes/events');
const messageRoutes = require('./routes/messages');
const shiftRoutes = require('./routes/shifts');
const loanRoutes = require('./routes/loans');
const companySettingsRoutes = require('./routes/companySettings');
const subscriptionRoutes = require('./routes/subscription');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const employeeProjectRoutes = require('./routes/employeeProjects');

// ==========================================
// 👑 SUPER ADMIN ROUTES
// ==========================================
const superAdminRoutes = require('./routes/superAdmin');
const superAdminTeamRoutes = require('./routes/superAdminTeamRoutes');
const rbacRoutes = require('./routes/rbacRoutes');
const securityRoutes = require('./routes/securityRoutes');
const masterDataRoutes = require('./routes/masterDataRoutes');
const hrOversightRoutes = require('./routes/hrOversightRoutes');
const dataManagementRoutes = require('./routes/dataManagementRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const platformReportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// ==========================================
// 🚀 ENDPOINT GATEWAY ROUTING ATTACHMENTS
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/vacancies', vacancyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', standardDesignationRoutes);
app.use('/api/designations', customRoleRoutes);

// ✅ NEW: Intercept Employee Data to format Skills & Education before saving
app.use('/api/employees', (req, res, next) => {
    if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
        
        // 1. Convert comma-separated skills string into an array
        if (req.body.skills && typeof req.body.skills === 'string') {
            req.body.skills = req.body.skills
                .split(',')
                .map(skill => skill.trim())
                .filter(skill => skill !== "");
        }
        
        // 2. Convert multiline education string into an array of objects
        if (req.body.education && typeof req.body.education === 'string') {
            req.body.education = req.body.education
                .split('\n')
                .filter(line => line.trim() !== "")
                .map(line => {
                    const [degree, institution, year] = line.split('|').map(item => item.trim());
                    return { degree, institution, year };
                });
        }
    }
    next(); // Pass the cleaned up data to the actual employeeRoutes
}, employeeRoutes);


app.use('/api/leaves', leaveRoutes);
app.use('/api/leave-policies', leavePolicyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/user', require('./routes/user'));

// ✅ NEW: Mounted the recruitment endpoint
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/feedback360', feedback360Routes);

app.use('/api/assets', assetRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/company-settings', companySettingsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/employee', employeeProjectRoutes);

// 👑 Super Admin Core Routes
const verifyToken = require('./middleware/auth');
const checkSuperAdminRole = require('./middleware/superAdminRbac');

const superAdminProtector = (req, res, next) => {
    if (req.path === '/login' || req.path === '/test-gateway' || (req.path === '/plans' && req.method === 'GET')) return next();
    verifyToken(req, res, () => {
        checkSuperAdminRole(['Owner', 'Billing', 'Support', 'Analytics', 'Content'])(req, res, next);
    });
};

const integrationsProtector = (req, res, next) => {
    // Exclude external OAuth callbacks since they don't carry internal JWTs
    if (req.path.endsWith('/callback')) {
        return next();
    }
    verifyToken(req, res, () => {
        checkSuperAdminRole(['Owner', 'Billing', 'Support', 'Analytics', 'Content'])(req, res, next);
    });
};

app.use('/api/superadmin', superAdminProtector, superAdminRoutes);
app.use('/api/super-admin/team', superAdminProtector, superAdminTeamRoutes);

// 👑 Super Admin Sub-Module Routes
app.use('/api/rbac', superAdminProtector, rbacRoutes);
app.use('/api/security', superAdminProtector, securityRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/hr-oversight', superAdminProtector, hrOversightRoutes);
app.use('/api/data-management', superAdminProtector, dataManagementRoutes);
app.use('/api/integrations', integrationsProtector, integrationRoutes);
app.use('/api/reports/platform-metrics', superAdminProtector, platformReportRoutes);
app.use('/api/notifications', notificationRoutes);

// ==========================================
// 🛑 ERROR HANDLING GATES & SYSTEM SHIELDS
// ==========================================
app.use((req, res, next) => {
    res.status(404).json({ message: "Requested application path layer endpoint not registered." });
});

app.use((err, req, res, next) => {
    console.error("Global System Crash Caught:", err.stack);
    res.status(500).json({ message: "Internal server runtime execution fault." });
});

// ==========================================
// 🔌 SOCKET.IO REAL-TIME EVENT ENGINE
// ==========================================
io.on('connection', (socket) => {
    console.log(`🔌 [Socket]: User connected: ${socket.id}`);

    // Listen for new messages and broadcast to everyone
    socket.on('sendMessage', (data) => {
        // data should contain { senderName, content, ... }
        io.emit('receiveMessage', data);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 [Socket]: User disconnected: ${socket.id}`);
    });
});

// ==========================================
// 🚀 SYSTEM BOOT TRIGGER (resilient)
// ==========================================
const MAX_PORT_RETRIES = 5;

const startServer = (port, attempt = 0) => {
    // Attach a one-time error handler for this listen attempt
    server.once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
            console.error(`✖ Port ${port} is already in use.`);
            if (attempt < MAX_PORT_RETRIES) {
                const nextPort = Number(port) + 1;
                console.log(`→ Attempting to bind to port ${nextPort} (attempt ${attempt + 1}/${MAX_PORT_RETRIES})...`);
                setTimeout(() => startServer(nextPort, attempt + 1), 500);
            } else {
                console.error(`✖ Failed to bind server after ${MAX_PORT_RETRIES} attempts. Please free the port or set PORT in your .env to an available port.`);
                process.exit(1);
            }
        } else {
            console.error('✖ Server encountered an unexpected error:', err);
            process.exit(1);
        }
    });

    server.listen(port, () => {
        console.log(`🚀 [Server Boot]: System instance live on: http://localhost:${port}`);
    });
};

startServer(PORT);