const mongoose = require('mongoose');

async function seed() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const Employee = require('./models/Employee');
        const Leave = require('./models/Leave');

        const vikas = await Employee.findOne({ email: 'emp@test.com' });
        if (!vikas) { console.error("Employee emp@test.com not found!"); process.exit(1); }
        console.log(`Found Vikas: ${vikas._id}, company: ${vikas.company}`);

        // Remove any existing leaves for this employee to avoid duplicates
        await Leave.deleteMany({ employeeId: vikas._id });
        console.log("Cleaned old leaves.");

        const leavesData = [
            {
                company: vikas.company,
                employeeId: vikas._id,
                employeeRole: 'employee',
                type: 'Casual Leave',
                startDate: '2026-07-16',
                endDate: '2026-07-17',
                days: 2,
                reason: 'Personal work and family commitment.',
                status: 'Pending',
            },
            {
                company: vikas.company,
                employeeId: vikas._id,
                employeeRole: 'employee',
                type: 'Sick Leave',
                startDate: '2026-07-22',
                endDate: '2026-07-22',
                days: 1,
                reason: 'Doctor appointment and medical checkup.',
                status: 'Approved',
                actionedByName: 'Neha Sharma',
                actionedByIdString: 'hr@test.com',
            },
            {
                company: vikas.company,
                employeeId: vikas._id,
                employeeRole: 'employee',
                type: 'Earned Leave',
                startDate: '2026-07-28',
                endDate: '2026-07-30',
                days: 3,
                reason: 'Planned vacation with family.',
                status: 'Pending',
            },
            {
                company: vikas.company,
                employeeId: vikas._id,
                employeeRole: 'employee',
                type: 'Casual Leave',
                startDate: '2026-08-04',
                endDate: '2026-08-04',
                days: 1,
                reason: 'Local festival holiday.',
                status: 'Approved',
                actionedByName: 'Neha Sharma',
                actionedByIdString: 'hr@test.com',
            },
            {
                company: vikas.company,
                employeeId: vikas._id,
                employeeRole: 'employee',
                type: 'Comp-off',
                startDate: '2026-08-11',
                endDate: '2026-08-11',
                days: 1,
                reason: 'Compensatory off for working on Sunday (Aug 2nd sprint release).',
                status: 'Rejected',
                actionedByName: 'Neha Sharma',
                actionedByIdString: 'hr@test.com',
            },
        ];

        const result = await Leave.insertMany(leavesData);
        console.log(`Seeded ${result.length} leave records successfully!`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
