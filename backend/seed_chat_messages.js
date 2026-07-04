const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Message = require('./models/Message');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const admins = await Admin.find({});
        const employees = await Employee.find({});

        console.log(`Found ${admins.length} Admins and ${employees.length} Employees.`);

        if (employees.length === 0) {
            console.log("No employees found!");
            process.exit(1);
        }

        const chatTemplates = [
            'Good morning team! Standup meeting starts at 10:30 AM on Google Meet.',
            'Reminder: Please update your sprint progress cards on the Task Board before EOD.',
            'Thanks HR team! Pay slips for this month have been issued.',
            'Great job on the new Flutter mobile app build release today! 🚀',
            'Anyone working on the payment gateway integration? Let us sync at 3 PM.',
            'All IT hardware requests submitted before Tuesday are approved.',
            'Please complete your annual health insurance policy verification form.'
        ];

        let count = 0;

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const companyId = emp.company || (admins[0] ? admins[0]._id : null);
            if (!companyId) continue;

            const content = chatTemplates[i % chatTemplates.length];

            const msg = new Message({
                company: companyId,
                sender: emp._id,
                senderModel: 'Employee',
                content: content,
                isGlobal: true
            });

            await msg.save();
            count++;
        }

        if (admins[0]) {
            const adminMsg = new Message({
                company: admins[0].company || admins[0]._id,
                sender: admins[0]._id,
                senderModel: 'Admin',
                content: '📢 Announcement: Company Townhall meeting scheduled for Friday at 4:00 PM!',
                isGlobal: true
            });
            await adminMsg.save();
            count++;
        }

        console.log(`✅ Seeded ${count} Live Team Chat messages into MongoDB!`);
        process.exit(0);
    } catch (e) {
        console.error("Error seeding chat messages:", e);
        process.exit(1);
    }
}
run();
