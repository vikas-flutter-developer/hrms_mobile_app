const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testPhase3() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const Admin = require('./models/Admin');
        
        const admin = await Admin.findOne({ email: 'shubhansh.986@gmail.com' });
        const token = jwt.sign(
            { id: admin._id, role: 'admin', company: admin._id },
            process.env.JWT_SECRET || 'HRMS_SUPER_SECRET_KEY@_123',
            { expiresIn: '1h' }
        );

        const BASE_URL = 'http://localhost:5000/api';
        const headers = { 'Authorization': `Bearer ${token}` };
        
        const results = {
            attendance: {},
            leaves: {},
            payrolls: {},
            expenses: {}
        };

        console.log("[TEST] Fetching Attendance...");
        let res = await fetch(`${BASE_URL}/attendance/admin/today`, { headers });
        results.attendance.today = res.status;

        console.log("[TEST] Fetching Leaves...");
        res = await fetch(`${BASE_URL}/leaves`, { headers });
        results.leaves.list = res.status;

        console.log("[TEST] Fetching Payrolls...");
        res = await fetch(`${BASE_URL}/payrolls`, { headers });
        results.payrolls.list = res.status;

        console.log("[TEST] Fetching Expenses...");
        res = await fetch(`${BASE_URL}/expenses`, { headers });
        results.expenses.list = res.status;

        console.log("\n[TEST RESULTS]");
        console.table(results);
        
        process.exit(0);
    } catch (err) {
        console.error("Fatal Error during testing:", err);
        process.exit(1);
    }
}

testPhase3();
