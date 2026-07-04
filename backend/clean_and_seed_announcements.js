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

        // Clear out old auto-generated leave notifications and gibberish test data
        await Announcement.deleteMany({ company: companyId });
        console.log("Cleared old notices.");

        const cleanAnnouncements = [
            {
                title: '📢 Q3 All-Hands Company Townhall Meeting',
                message: 'Dear Team, please join us this Friday at 4:00 PM for the Q3 Company Townhall. We will be sharing key business performance metrics, client milestones, and recognizing our top performers of the quarter.',
                targetAudience: 'All',
            },
            {
                title: '🌴 Official Notice: Upcoming Public Holiday Schedule',
                message: 'Please note that the office will remain closed on Monday in observance of the national holiday. Essential support teams should coordinate with department leads for emergency roster coverage.',
                targetAudience: 'All',
            },
            {
                title: '🔒 Mandatory Cyber-Security & Data Privacy Training',
                message: 'All Engineering, IT, and Finance team members are required to complete the 2026 Information Security and SOC2 Refresher Module by July 20. Access the training portal via your employee credentials.',
                targetAudience: 'Specific Department',
                targetDepartments: ['Engineering', 'IT', 'Finance']
            },
            {
                title: '🚀 HRMS 3.0 Enterprise Mobile App Release',
                message: 'We are excited to announce the official launch of HRMS v3.0! Key upgrades include Asset Damage Recovery Tracking, Live Socket Team Chat, Payslip PDF Export, and Project Task Boards.',
                targetAudience: 'All',
            },
            {
                title: '🏥 Annual Health Insurance Policy Renewal Guide',
                message: 'The annual corporate medical insurance enrollment window is now open. Employees can add dependents or upgrade coverage tiers before EOD Friday through the HR portal.',
                targetAudience: 'All',
            },
            {
                title: '⚽ Annual Inter-Department Sports & Cultural League 2026',
                message: 'Registrations are now open for the 2026 Corporate Football & Badminton Tournament! Interested staff members can register their department teams with the Sports Committee.',
                targetAudience: 'All',
            }
        ];

        for (const tpl of cleanAnnouncements) {
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

        console.log("✅ Seeded 6 clean, professional Enterprise Announcements into MongoDB!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding clean announcements:", e);
        process.exit(1);
    }
}
run();
