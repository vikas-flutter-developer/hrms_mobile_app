const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const TrainingProgram = require('./models/TrainingProgram');
const TrainingAssignment = require('./models/TrainingAssignment');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // Clear existing training
        await TrainingProgram.deleteMany({});
        await TrainingAssignment.deleteMany({});
        console.log("Cleared existing training programs and assignments.");

        const admins = await Admin.find({});
        if (admins.length === 0) {
            console.log("No admins found!");
            process.exit(1);
        }

        const companyIds = admins.map(a => a._id);

        // 10 Professional course templates
        const courseTemplates = [
            {
                title: 'Corporate Security Compliance 2026',
                description: 'Essential protocols for digital infrastructure, email security, and whitelisting procedures.',
                category: 'Compliance',
                mode: 'Online',
                trainer: 'Infosec Audit Team'
            },
            {
                title: 'Advanced Flutter Architecture Patterns',
                description: 'Modular states routing, Dio networking client setup, and dynamic Socket integrations.',
                category: 'Technical',
                mode: 'Hybrid',
                trainer: 'Mobile Architect Lead'
            },
            {
                title: 'AWS Certified Cloud Solutions Architect',
                description: 'Hands-on training for designing VPCs, IAM policies, and serverless compute pipelines.',
                category: 'Technical',
                mode: 'Online',
                trainer: 'AWS Partner Instructor'
            },
            {
                title: 'Agile & Scrum Project Management',
                description: 'Effective sprint planning, velocity estimation, backlog grooming, and team leadership.',
                category: 'Soft Skills',
                mode: 'Offline',
                trainer: 'Agile Transformation Coach'
            },
            {
                title: 'UI/UX Glassmorphism & Micro-animations',
                description: 'Creating high-fidelity mobile experiences, haromonious palettes, and dynamic motion states.',
                category: 'Technical',
                mode: 'Online',
                trainer: 'Lead Product Designer'
            },
            {
                title: 'SQL Performance Tuning & Query Optimization',
                description: 'Understanding indexing, execution plans, connection pools, and database load balancing.',
                category: 'Technical',
                mode: 'Online',
                trainer: 'Principal DBA Consultant'
            },
            {
                title: 'Generative AI & LLM Prompt Engineering',
                description: 'Leveraging AI capabilities, building custom workflows, and context wrapping for agents.',
                category: 'Technical',
                mode: 'Hybrid',
                trainer: 'AI Research Team'
            },
            {
                title: 'Client Communication & Presentation Mastery',
                description: 'Strategies for running remote client demo days, negotiating scopes, and managing expectations.',
                category: 'Soft Skills',
                mode: 'Offline',
                trainer: 'VP of Customer Success'
            },
            {
                title: 'Introduction to Kotlin Multiplatform (KMP)',
                description: 'Sharing business logic, API models, and databases across iOS and Android natively.',
                category: 'Technical',
                mode: 'Online',
                trainer: 'Developer Relations Engineer'
            },
            {
                title: 'Prevention of Sexual Harassment (POSH) Awareness',
                description: 'Mandatory annual training program covering code of conduct, safe workspaces, and redressal.',
                category: 'Compliance',
                mode: 'Online',
                trainer: 'Internal POSH Committee'
            }
        ];

        for (const companyId of companyIds) {
            console.log(`Seeding 10 training programs for company: ${companyId}`);

            const companyEmployees = await Employee.find({ company: companyId, status: 'Active' });
            
            const savedPrograms = [];
            for (const cData of courseTemplates) {
                const program = new TrainingProgram({
                    company: companyId,
                    title: cData.title,
                    description: cData.description,
                    category: cData.category,
                    mode: cData.mode,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
                    trainer: cData.trainer,
                    status: 'Ongoing',
                    createdBy: companyId
                });
                const saved = await program.save();
                savedPrograms.push(saved);
            }
            console.log(`  - Seeded ${savedPrograms.length} courses.`);

            if (companyEmployees.length > 0) {
                console.log(`  - Assigning employees to the 10 courses...`);
                // Let's create 10 assignments
                const statuses = ['In Progress', 'Completed', 'Assigned', 'In Progress', 'Completed', 'Assigned', 'In Progress', 'Assigned', 'In Progress', 'Completed'];
                for (let i = 0; i < 10; i++) {
                    // Match employee cyclically
                    const emp = companyEmployees[i % companyEmployees.length];
                    const prog = savedPrograms[i];
                    
                    const assign = new TrainingAssignment({
                        company: companyId,
                        employee: emp._id,
                        trainingProgram: prog._id,
                        status: statuses[i],
                        assignedBy: companyId
                    });
                    await assign.save();
                }
                console.log(`  - Seeded 10 training assignments for company.`);
            }
        }

        console.log("🚀 10 Training courses and 10 assignments seeded successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding training:", e);
        process.exit(1);
    }
}
run();
