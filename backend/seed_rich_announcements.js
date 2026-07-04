const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Announcement = require('./models/Announcement');

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
        const adminAuthor = admins[0] ? admins[0]._id : employees[0]._id;

        // Wipe out all existing announcements
        await Announcement.deleteMany({ company: companyId });
        console.log("Cleared existing notice collection.");

        const richAnnouncements = [
            {
                title: '🏢 Q3 All-Hands Executive Townhall & Strategy Update',
                message: 'Dear Team, please join our CEO and Leadership Team this Friday at 4:00 PM IST for our Q3 All-Hands Townhall. We will review H1 financial milestones, celebrate major enterprise client wins, and outline key strategic initiatives for Q3. Attendance is mandatory for all staff.',
                targetAudience: 'All',
            },
            {
                title: '🌴 Official Notice: Upcoming Festival Holidays & Office Closure',
                message: 'Please be advised that the corporate office will remain closed on Monday, July 14th, in observance of the upcoming national holiday. Essential 24/7 IT Operations and Client Support teams will follow their pre-approved holiday shift roster.',
                targetAudience: 'All',
            },
            {
                title: '🚀 HRMS 3.0 Enterprise Mobile App Live Launch',
                message: 'We are thrilled to officially roll out HRMS Mobile v3.0! This release introduces Live Socket Team Chat, Asset Damage Settlement Tracking, Instant Payslip PDF Downloads, and Interactive Project Kanban Boards.',
                targetAudience: 'All',
            },
            {
                title: '🔒 Mandatory SOC2 Data Privacy & Cyber-Security Workshop',
                message: 'All members of Engineering, Product Development, and IT Operations are required to complete the annual Information Security and Anti-Phishing module by EOD July 20th. Please log into the Learning Portal to complete your certification.',
                targetAudience: 'Specific Department',
                targetDepartments: ['Engineering', 'IT', 'Product']
            },
            {
                title: '🏥 Corporate Group Health Insurance Annual Enrollment Open',
                message: 'The annual window for adding dependents, upgrading hospital coverage plans, and updating emergency contacts for your Corporate Health Policy is now open. Submissions must be finalized in HR Portal by July 25th.',
                targetAudience: 'All',
            },
            {
                title: '💡 Hackathon 2026: AI & Workflow Automation Challenge',
                message: 'Get ready for our annual 36-hour Innovation Hackathon! Form team of up to 4 members to build AI-driven workflow solutions. Cash prizes of up to $5,000 for winning projects! Registrations open today.',
                targetAudience: 'All',
            },
            {
                title: '🏆 Q2 Employee Excellence Awards: Call for Peer Nominations',
                message: 'Recognize an exceptional colleague who demonstrated extraordinary dedication this past quarter. Peer nomination forms are now live on the portal. Deadline for submission is July 18th.',
                targetAudience: 'All',
            },
            {
                title: '⚽ Corporate Sports & Cultural League 2026 Registration',
                message: 'Inter-department Football, Cricket, and Badminton tournaments kick off next weekend at the City Sports Complex! Register your departmental squad with the Employee Welfare Committee by Wednesday.',
                targetAudience: 'All',
            }
        ];

        for (const tpl of richAnnouncements) {
            const anc = new Announcement({
                company: companyId,
                title: tpl.title,
                message: tpl.message,
                targetAudience: tpl.targetAudience,
                targetDepartments: tpl.targetDepartments || [],
                createdBy: adminAuthor,
                createdByModel: 'Admin'
            });
            await anc.save();
        }

        console.log("🚀 Successfully seeded 8 high-quality, professional corporate announcements!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding rich announcements:", e);
        process.exit(1);
    }
}
run();
