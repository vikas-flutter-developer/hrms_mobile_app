const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testPhase4() {
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
            performance: {},
            training: {},
            compliance: {}
        };

        console.log("[TEST] Fetching Performance Cycles...");
        let res = await fetch(`${BASE_URL}/performance/cycles`, { headers });
        results.performance.cycles = res.status;

        console.log("[TEST] Fetching Training Programs...");
        res = await fetch(`${BASE_URL}/training/programs`, { headers });
        results.training.programs = res.status;

        console.log("[TEST] Fetching Compliance Records...");
        res = await fetch(`${BASE_URL}/compliance/records`, { headers });
        results.compliance.records = res.status;

        console.log("\n[TEST RESULTS]");
        console.table(results);
        
        process.exit(0);
    } catch (err) {
        console.error("Fatal Error during testing:", err);
        process.exit(1);
    }
}

testPhase4();
