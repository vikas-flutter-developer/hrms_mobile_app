const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Announcement = require('./models/Announcement');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Event = require('./models/Event');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const admins = await Admin.find({});
        const employees = await Employee.find({});

        if (employees.length === 0) {
            console.log("No employees found!");
            process.exit(1);
        }

        const companyId = employees[0].company || (admins[0] ? admins[0]._id : null);

        // 1. Seed Announcements
        const sampleAnnouncements = [
            {
                title: '📢 Q3 All-Hands Townhall Meeting',
                message: 'Join us on Friday at 4 PM for the Q3 Townhall meeting. We will discuss quarterly achievements and key product roadmap goals.',
                targetAudience: 'All',
            },
            {
                title: '🎉 Official Holiday Announcement: Eid & Independence Day',
                message: 'Office will remain closed on upcoming official national holidays. Please coordinate with team leads for urgent client support schedules.',
                targetAudience: 'All',
            },
            {
                title: '🔒 Mandatory Security & Cyber-Safety Refresher Course',
                message: 'All Engineering and IT staff members must complete the annual SOC2 compliance and anti-phishing training module by July 15.',
                targetAudience: 'Specific Department',
                targetDepartments: ['Engineering', 'IT']
            },
            {
                title: '🚀 HRMS 3.0 Mobile App Major Feature Release',
                message: 'We are thrilled to launch the new IT Asset Inventory, Damage Settlement, and Live Team Chat features on our enterprise app!',
                targetAudience: 'All',
            }
        ];

        for (const tpl of sampleAnnouncements) {
            const anc = new Announcement({
                company: companyId,
                title: tpl.title,
                message: tpl.message,
                targetAudience: tpl.targetAudience,
                targetDepartments: tpl.targetDepartments || [],
                createdBy: admins[0] ? admins[0]._id : employees[0]._id,
                createdByModel: 'Admin'
            });
            await anc.save();
        }
        console.log("✅ Seeded Announcements!");

        // 2. Seed Projects & Tasks
        const sampleProjects = [
            {
                name: 'HRMS Mobile App v3.0 Upgrade',
                description: 'Complete UI redesign, asset recovery module, payslip PDF generator, and live websocket team chat.',
                department: 'Engineering',
                status: 'In Progress',
                startDate: '2026-06-01',
                endDate: '2026-08-30',
            },
            {
                name: 'Enterprise SOC2 & Data Security Audit',
                description: 'End-to-end security compliance, role-based access control (RBAC), and encrypted audit logging.',
                department: 'IT',
                status: 'In Progress',
                startDate: '2026-05-15',
                endDate: '2026-07-31',
            },
            {
                name: 'Q3 Talent Acquisition & Hiring Sprint',
                description: 'Recruitment pipeline scaling to onboard 15 Senior Full-Stack Engineers & Product Designers.',
                department: 'Human Resources',
                status: 'Not Started',
                startDate: '2026-07-01',
                endDate: '2026-09-30',
            }
        ];

        for (let i = 0; i < sampleProjects.length; i++) {
            const pTpl = sampleProjects[i];
            const manager = employees[i % employees.length];
            const lead = employees[(i + 1) % employees.length];
            const membersList = employees.slice(0, 4).map(e => e._id);

            const prj = new Project({
                company: companyId,
                title: pTpl.name,
                description: pTpl.description,
                department: pTpl.department,
                status: pTpl.status,
                startDate: pTpl.startDate,
                deadline: pTpl.endDate,
                projectManager: manager._id,
                teamLead: lead._id,
                members: membersList,
                createdBy: admins[0] ? admins[0]._id : manager._id
            });
            const savedPrj = await prj.save();

            // Seed Tasks for this Project
            const taskTitles = [
                'Implement Asset Damage Recovery Modal UI',
                'Setup MongoDB Atlas Indexing for Real-Time Chat',
                'Design Payslip PDF Generator & WhatsApp Link',
                'Configure Push Notifications for Leave Approvals',
                'Conduct End-to-End Regression Test Suite'
            ];

            for (let j = 0; j < taskTitles.length; j++) {
                const empAssigned = employees[(i + j) % employees.length];
                const task = new Task({
                    company: companyId,
                    project: savedPrj._id,
                    title: taskTitles[j],
                    description: `Detailed task execution for ${taskTitles[j]}`,
                    status: j % 3 === 0 ? 'Completed' : (j % 2 === 0 ? 'In Progress' : 'Todo'),
                    priority: j % 2 === 0 ? 'High' : 'Medium',
                    assignedTo: empAssigned._id,
                    deadline: new Date(Date.now() + (j + 1) * 86400000 * 3)
                });
                await task.save();
            }
        }
        console.log("✅ Seeded Projects and Tasks!");

        // 3. Seed Company Events
        const sampleEvents = [
            {
                title: '🎉 Q3 Employee Recognition & Pizza Party',
                description: 'Celebrating high performers and welcoming new team members in the central cafeteria.',
                date: '2026-07-18',
                location: 'Main Office Cafeteria',
                status: 'Upcoming'
            },
            {
                title: '⚽ Annual Inter-Department Football Tournament',
                description: 'Annual weekend sports event at Turf Club Arena. Snacks & refreshments provided.',
                date: '2026-07-25',
                location: 'City Sports Turf Arena',
                status: 'Upcoming'
            },
            {
                title: '💡 Hackathon 2026: AI & Automation Sprint',
                description: '24-hour innovation hackathon with cash prizes for top automated workflow solutions.',
                date: '2026-08-10',
                location: 'Auditorium Level 4',
                status: 'Upcoming'
            }
        ];

        for (const evTpl of sampleEvents) {
            const ev = new Event({
                company: companyId,
                title: evTpl.title,
                description: evTpl.description,
                date: evTpl.date,
                location: evTpl.location,
                status: evTpl.status
            });
            await ev.save();
        }
        console.log("✅ Seeded Company Events!");

        console.log("🚀 All extended modules seeded successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding extended modules:", e);
        process.exit(1);
    }
}
run();
