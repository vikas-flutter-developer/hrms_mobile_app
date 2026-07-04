const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Leave = require('./models/Leave');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const admins = await Admin.find({});
        console.log(`Found ${admins.length} Admins:`);
        admins.forEach(a => console.log(` - Admin: ID=${a._id}, email=${a.email}, name=${a.name}, companyName=${a.companyName}`));

        const employees = await Employee.find({});
        console.log(`Found ${employees.length} Employees:`);
        employees.forEach(e => console.log(` - Employee: ID=${e._id}, email=${e.email}, name=${e.name}, company=${e.company}`));

        if (admins.length === 0 || employees.length === 0) {
            console.log("No admins or employees found! Running seed_comprehensive_data.js logic first...");
        }

        // We will seed pending leave requests for all employees under all companies/admins
        const pendingLeavesToSeed = [
            {
                type: 'Casual Leave',
                startDate: '2026-07-10',
                endDate: '2026-07-12',
                days: 3,
                reason: 'Family event and personal work at home town'
            },
            {
                type: 'Sick Leave',
                startDate: '2026-07-06',
                endDate: '2026-07-07',
                days: 2,
                reason: 'Severe fever and doctor recommended bed rest'
            },
            {
                type: 'Earned Leave',
                startDate: '2026-07-20',
                endDate: '2026-07-25',
                days: 6,
                reason: 'Annual family vacation trip to hill station'
            },
            {
                type: 'Comp-off',
                startDate: '2026-07-15',
                endDate: '2026-07-15',
                days: 1,
                reason: 'Worked on weekend server migration project'
            },
            {
                type: 'Casual Leave',
                startDate: '2026-07-18',
                endDate: '2026-07-19',
                days: 2,
                reason: 'Passport renewal appointment and document verification'
            }
        ];

        let createdCount = 0;
        for (const emp of employees) {
            const companyId = emp.company || (admins[0] ? admins[0]._id : null);
            if (!companyId) continue;

            for (let i = 0; i < 2; i++) {
                const template = pendingLeavesToSeed[(createdCount) % pendingLeavesToSeed.length];
                const leave = new Leave({
                    company: companyId,
                    employeeId: emp._id,
                    employeeRole: 'employee',
                    type: template.type,
                    startDate: template.startDate,
                    endDate: template.endDate,
                    days: template.days,
                    reason: `${template.reason} (${emp.name})`,
                    status: 'Pending',
                    isLOP: false,
                    isLossOfPay: false
                });
                await leave.save();
                createdCount++;
            }
        }

        console.log(`✅ Successfully inserted ${createdCount} pending leave requests into the database!`);

        const totalPending = await Leave.countDocuments({ status: 'Pending' });
        console.log(`Total Pending Leaves in DB: ${totalPending}`);

        process.exit(0);
    } catch (err) {
        console.error("Error in check_and_seed_leaves:", err);
        process.exit(1);
    }
}

run();
