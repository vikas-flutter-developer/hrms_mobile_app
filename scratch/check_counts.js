const mongoose = require('mongoose');

async function check() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const Admin = require('../backend/models/Admin');
        const Employee = require('../backend/models/Employee');
        const Leave = require('../backend/models/Leave');
        const Candidate = require('../backend/models/Candidate');
        const Payslip = require('../backend/models/Payslip');
        const Attendance = require('../backend/models/Attendance');

        const admin = await Admin.findOne({ email: 'admin@nexora.in' });
        if (!admin) {
            console.log("Admin not found!");
            process.exit(1);
        }
        console.log(`Admin Company ID: ${admin._id}`);

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        console.log(`Today's ISO string on server: ${todayStr}`);

        // 1. Employees
        const totalEmp = await Employee.countDocuments({ company: admin._id, status: 'Active' });
        console.log(`Active Employees: ${totalEmp}`);

        // 2. Attendance today
        const attStats = await Attendance.aggregate([
            { $match: { company: admin._id, date: todayStr } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        console.log("Attendance stats for today:", attStats);

        // 3. Leaves today
        const leavesCount = await Leave.countDocuments({
            company: admin._id,
            status: 'Approved',
            startDate: { $lte: todayStr },
            endDate: { $gte: todayStr }
        });
        console.log(`Leaves today (string comparison): ${leavesCount}`);

        const leavesCountDate = await Leave.countDocuments({
            company: admin._id,
            status: 'Approved',
            startDate: { $lte: today },
            endDate: { $gte: today }
        });
        console.log(`Leaves today (date object comparison): ${leavesCountDate}`);

        // Let's print all approved leaves in July 2026
        const approvedLeaves = await Leave.find({ company: admin._id, status: 'Approved' });
        console.log("Approved Leaves in DB:");
        approvedLeaves.forEach(l => {
            console.log(` - ID: ${l._id}, Employee: ${l.employeeId}, Range: ${l.startDate} to ${l.endDate}`);
        });

        // 4. Candidates
        const candidateStats = await Candidate.aggregate([
            { $match: { company: admin._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        console.log("Candidate stats:", candidateStats);

        // 5. Payslips
        const currentMonthStr = today.toLocaleString('default', { month: 'short', year: 'numeric' });
        console.log(`Current month string: ${currentMonthStr}`);
        const processedPayslips = await Payslip.countDocuments({
            company: admin._id,
            month: currentMonthStr,
            status: 'Processed'
        });
        console.log(`Processed payslips count: ${processedPayslips}`);
        
        const allPayslips = await Payslip.find({ company: admin._id }).limit(5);
        console.log("Sample Payslips in DB:");
        allPayslips.forEach(p => {
            console.log(` - Month: ${p.month}, Status: ${p.status}, Company: ${p.company}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
