const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Job = require('./models/Job');
const Candidate = require('./models/Candidate');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // Clear existing recruitment records
        await Job.deleteMany({});
        await Candidate.deleteMany({});
        console.log("Cleared existing Jobs and Candidates.");

        const admins = await Admin.find({});
        if (admins.length === 0) {
            console.log("No admins found!");
            process.exit(1);
        }

        const companyIds = admins.map(a => a._id);

        for (const companyId of companyIds) {
            console.log(`Seeding jobs and candidates for company: ${companyId}`);

            // 1. Create Jobs
            const jobsData = [
                {
                    title: 'Senior Flutter Developer',
                    description: 'We are seeking a senior mobile developer to own our state management architectures and socket pipelines.',
                    jobType: 'Full-time',
                    experienceRequired: '4-6 years',
                    salaryRange: '₹12,00,000 - ₹18,00,000 LPA',
                    location: 'Mumbai (Hybrid)',
                    status: 'Open'
                },
                {
                    title: 'HR Specialist & Talent Partner',
                    description: 'Manage recruitment pipelines, statutory compliance policies, and staff onboarding.',
                    jobType: 'Full-time',
                    experienceRequired: '2-4 years',
                    salaryRange: '₹6,00,000 - ₹9,00,000 LPA',
                    location: 'Pune (Onsite)',
                    status: 'Open'
                },
                {
                    title: 'QA Lead Automation Analyst',
                    description: 'Setup integration tests, appium framework, and end-to-end regression scripts.',
                    jobType: 'Contract',
                    experienceRequired: '5+ years',
                    salaryRange: '₹15,00,000 - ₹20,00,000 LPA',
                    location: 'Remote',
                    status: 'Open'
                }
            ];

            const createdJobs = [];
            for (const item of jobsData) {
                const newJob = new Job({
                    ...item,
                    company: companyId,
                    createdBy: companyId
                });
                const saved = await newJob.save();
                createdJobs.push(saved);
            }
            console.log(`  - Seeded ${createdJobs.length} Job Vacancies.`);

            // 2. Create Candidates
            const candidatesData = [
                {
                    name: 'Aishwarya Patil',
                    email: 'aishwarya.patil@gmail.com',
                    phone: '+91 98765 43210',
                    jobIndex: 0, // Senior Flutter Developer
                    status: 'Interviewing',
                    feedback: 'Excellent expertise in Provider pattern and socket notifications. Technical round scheduled.',
                    aiScore: 88
                },
                {
                    name: 'Rohan Deshmukh',
                    email: 'rohan.desh@yahoo.com',
                    phone: '+91 91234 56789',
                    jobIndex: 0, // Senior Flutter Developer
                    status: 'Offered',
                    feedback: 'Strong problem-solving skills. Offered released, awaiting response.',
                    aiScore: 92
                },
                {
                    name: 'Sneha Iyer',
                    email: 'sneha.iyer@outlook.com',
                    phone: '+91 95432 10987',
                    jobIndex: 1, // HR Specialist
                    status: 'Applied',
                    feedback: 'Profiles matches experience requirements. Resume shortlisted.',
                    aiScore: 79
                },
                {
                    name: 'Rahul Khanna',
                    email: 'rahul.khanna@gmail.com',
                    phone: '+91 88888 77777',
                    jobIndex: 1, // HR Specialist
                    status: 'Hired',
                    feedback: 'Onboarded as Talent Specialist. Document verification complete.',
                    aiScore: 85
                },
                {
                    name: 'Vikram Malhotra',
                    email: 'vikram.mal@gmail.com',
                    phone: '+91 77777 66666',
                    jobIndex: 2, // QA Lead
                    status: 'Shortlisted',
                    feedback: 'Good test automation logs using Cypress and Selenium.',
                    aiScore: 81
                },
                {
                    name: 'Nisha Kulkarni',
                    email: 'nisha.k@gmail.com',
                    phone: '+91 99999 88888',
                    jobIndex: 2, // QA Lead
                    status: 'Interviewing',
                    feedback: 'L2 interview complete. Performance is positive.',
                    aiScore: 84
                }
            ];

            for (const cItem of candidatesData) {
                const job = createdJobs[cItem.jobIndex];
                const candidate = new Candidate({
                    company: companyId,
                    jobId: job._id,
                    name: cItem.name,
                    email: cItem.email,
                    phone: cItem.phone,
                    status: cItem.status,
                    feedback: cItem.feedback,
                    aiScore: cItem.aiScore
                });
                await candidate.save();
            }
            console.log(`  - Seeded ${candidatesData.length} Candidate Applications.`);
        }

        console.log("🚀 Recruitment data seeded successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding recruitment:", e);
        process.exit(1);
    }
}
run();
