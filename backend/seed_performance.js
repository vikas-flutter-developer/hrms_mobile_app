const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const PerformanceCycle = require('./models/PerformanceCycle');
const PerformanceReview = require('./models/PerformanceReview');
const KPI = require('./models/KPI');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // Clear existing collections
        await PerformanceCycle.deleteMany({});
        await PerformanceReview.deleteMany({});
        await KPI.deleteMany({});
        console.log("Cleared existing Performance Cycles, Reviews, and KPIs.");

        const admins = await Admin.find({});
        if (admins.length === 0) {
            console.log("No admins found!");
            process.exit(1);
        }

        const companyIds = admins.map(a => a._id);

        for (const companyId of companyIds) {
            console.log(`Seeding performance data for company: ${companyId}`);

            // 1. Create Performance Cycle
            const cycle = new PerformanceCycle({
                company: companyId,
                name: 'Q2 Performance Review Cycle 2026',
                startDate: new Date('2026-04-01'),
                endDate: new Date('2026-06-30'),
                frequency: 'Quarterly',
                status: 'Active',
                createdBy: companyId
            });
            const savedCycle = await cycle.save();
            console.log(`  - Seeded Performance Cycle: ${savedCycle.name}`);

            // Find some active employees in this company to attach KPIs & reviews to
            const companyEmployees = await Employee.find({ company: companyId, status: 'Active' });
            if (companyEmployees.length === 0) {
                console.log(`  - No active employees found for company: ${companyId}. Skipping review generation.`);
                continue;
            }

            // 2. Create KPIs
            const kpiTitles = [
                'Code Delivery SLA Rate',
                'Client Satisfaction Feedback',
                'Sprint Task Resolution Rate'
            ];

            const createdKPIs = [];
            for (let i = 0; i < Math.min(companyEmployees.length, kpiTitles.length); i++) {
                const emp = companyEmployees[i];
                const newKPI = new KPI({
                    company: companyId,
                    title: kpiTitles[i],
                    description: `Maintain >90% benchmark for ${kpiTitles[i].toLowerCase()} deliverables.`,
                    employee: emp._id,
                    department: emp.department || 'Engineering',
                    unit: '%',
                    targetValue: 95,
                    baseline: 80,
                    weight: 30,
                    frequency: 'Monthly',
                    createdBy: companyId
                });
                const savedKPI = await newKPI.save();
                createdKPIs.push(savedKPI);
            }
            console.log(`  - Seeded ${createdKPIs.length} KPIs.`);

            // 3. Create Performance Reviews
            // We'll generate reviews for the first 3 active employees
            const commentsList = [
                'Demonstrates exceptional command of system architecture. Consistently beats delivery deadlines.',
                'Good communication skills. Technical delivery is sound, but needs to focus on test cases automation.',
                'Proactive team participant. Always ready to debug production logs and assists junior developers.'
            ];
            const ratings = [5, 4, 4];
            const statuses = ['Submitted', 'Draft', 'Reviewed'];

            for (let idx = 0; idx < Math.min(companyEmployees.length, 3); idx++) {
                const emp = companyEmployees[idx];
                const review = new PerformanceReview({
                    company: companyId,
                    employee: emp._id,
                    cycle: savedCycle._id,
                    reviewer: companyEmployees[0]._id, // First employee acts as reviewer/colleague
                    manager: companyEmployees[0]._id,
                    selfAppraisal: [
                        { title: 'Technical Contributions', comments: 'Successfully completed cloud migration task.', score: 4 }
                    ],
                    managerAppraisal: [
                        { title: 'Technical Capability', comments: 'Delivered migrations with zero downtime.', score: 5 }
                    ],
                    kpiAssessments: createdKPIs.map(k => k._id),
                    rating: ratings[idx],
                    status: statuses[idx],
                    overallComments: commentsList[idx],
                    createdBy: companyId
                });
                await review.save();
            }
            console.log(`  - Seeded 3 Performance Reviews.`);
        }

        console.log("🚀 Performance data seeded successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding performance:", e);
        process.exit(1);
    }
}
run();
