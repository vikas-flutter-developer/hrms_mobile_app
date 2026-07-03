const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testPhase2() {
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
            departments: {},
            designations: {},
            employees: {},
            recruitment: {}
        };

        console.log("[TEST] Fetching Departments...");
        let res = await fetch(`${BASE_URL}/departments`, { headers });
        results.departments.list = res.status;

        console.log("[TEST] Fetching Designations...");
        res = await fetch(`${BASE_URL}/designations`, { headers });
        results.designations.list = res.status;

        console.log("[TEST] Fetching Employees...");
        res = await fetch(`${BASE_URL}/employees`, { headers });
        results.employees.list = res.status;

        console.log("[TEST] Fetching Recruitment Jobs...");
        res = await fetch(`${BASE_URL}/recruitment/jobs`, { headers });
        results.recruitment.jobs = res.status;

        console.log("\n[TEST RESULTS]");
        console.table(results);
        
        process.exit(0);
    } catch (err) {
        console.error("Fatal Error during testing:", err);
        process.exit(1);
    }
}

testPhase2();
