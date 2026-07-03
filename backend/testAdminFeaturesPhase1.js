const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testPhase1() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Admin = require('./models/Admin');
        
        // Find an admin user
        const admin = await Admin.findOne({ email: 'shubhansh.986@gmail.com' });
        if (!admin) {
            console.error("Admin not found!");
            process.exit(1);
        }

        console.log(`[TEST] Authenticating as: ${admin.email}`);
        const token = jwt.sign(
            { id: admin._id, role: 'admin', company: admin._id },
            process.env.JWT_SECRET || 'HRMS_SUPER_SECRET_KEY@_123',
            { expiresIn: '1h' }
        );

        const BASE_URL = 'http://localhost:5000/api';
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const results = {
            dashboard: {},
            company: {},
            plans: {},
            notifications: {}
        };

        // 1. Dashboard Metrics
        console.log("[TEST] Fetching Dashboard Metrics...");
        let res = await fetch(`${BASE_URL}/dashboard/metrics`, { headers });
        results.dashboard.metrics = res.status;

        res = await fetch(`${BASE_URL}/dashboard/charts`, { headers });
        results.dashboard.charts = res.status;

        res = await fetch(`${BASE_URL}/dashboard/events`, { headers });
        results.dashboard.events = res.status;

        res = await fetch(`${BASE_URL}/dashboard/activity-feed`, { headers });
        results.dashboard.activityFeed = res.status;

        // 2. Company Profile
        console.log("[TEST] Fetching Company Settings...");
        res = await fetch(`${BASE_URL}/company-settings`, { headers });
        results.company.settings = res.status;

        // 3. Subscription Plans (Public)
        console.log("[TEST] Fetching Plans...");
        res = await fetch(`${BASE_URL}/superadmin/plans`);
        results.plans.publicAccess = res.status;

        // 4. Notifications
        console.log("[TEST] Fetching Notifications...");
        res = await fetch(`${BASE_URL}/notifications`, { headers });
        results.notifications.list = res.status;

        console.log("\n[TEST RESULTS]");
        console.table(results);
        
        process.exit(0);
    } catch (err) {
        console.error("Fatal Error during testing:", err);
        process.exit(1);
    }
}

testPhase1();
