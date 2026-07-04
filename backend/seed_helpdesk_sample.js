const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Ticket = require('./models/Ticket');

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

        const ticketTemplates = [
            {
                subject: 'VPN Connection Timeout Error',
                category: 'IT Support',
                priority: 'High',
                description: 'Cisco AnyConnect VPN disconnects every 15 minutes while accessing internal staging servers.',
                status: 'Open',
                threadMsg: 'I am unable to connect to the internal staging database server via VPN.'
            },
            {
                subject: 'Figma Pro License Renewal Request',
                category: 'Software Access',
                priority: 'Medium',
                description: 'Design team Figma seat expired today. Requesting annual license renewal.',
                status: 'In Progress',
                threadMsg: 'Our team needs Figma Pro access for the upcoming UI sprint.'
            },
            {
                subject: 'Payroll Tax Slip Form 16 Clarification',
                category: 'Payroll & Compensation',
                priority: 'Medium',
                description: 'Discrepancy in HRA exemption calculation for Q3 tax statement.',
                status: 'Open',
                threadMsg: 'Could payroll team verify my HRA tax exemption certificate uploaded last week?'
            },
            {
                subject: 'Dual Monitor Adapter Cable Required',
                category: 'Hardware Request',
                priority: 'Low',
                description: 'USB-C to HDMI 4K display cable needed for dual monitor setup.',
                status: 'Resolved',
                threadMsg: 'Requesting a USB-C to HDMI cable for my workstation desk.'
            },
            {
                subject: 'Slack Channel Access Request: #mobile-release',
                category: 'Software Access',
                priority: 'Low',
                description: 'Need invite to private Slack channel for QA deployment notifications.',
                status: 'Resolved',
                threadMsg: 'Please add my Slack user account to #mobile-release channel.'
            }
        ];

        let count = 0;

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const companyId = emp.company || (admins[0] ? admins[0]._id : null);
            if (!companyId) continue;

            const tpl = ticketTemplates[i % ticketTemplates.length];

            const ticket = new Ticket({
                company: companyId,
                employeeId: emp._id,
                employeeModel: 'Employee',
                isSuperAdminTicket: false,
                subject: `${tpl.subject} (${emp.name})`,
                category: tpl.category,
                priority: tpl.priority,
                description: tpl.description,
                status: tpl.status,
                thread: [
                    {
                        senderId: emp._id,
                        senderModel: 'Employee',
                        message: tpl.threadMsg,
                        timestamp: new Date()
                    }
                ]
            });

            await ticket.save();
            count++;
        }

        console.log(`✅ Seeded ${count} Helpdesk IT Support Tickets into MongoDB!`);
        process.exit(0);
    } catch (e) {
        console.error("Error seeding helpdesk tickets:", e);
        process.exit(1);
    }
}
run();
