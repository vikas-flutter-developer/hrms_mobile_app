const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Project = require('./models/Project');
const Task = require('./models/Task');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // 1. Clear existing Projects and Tasks
        await Project.deleteMany({});
        await Task.deleteMany({});
        console.log("Cleared all existing Projects and Tasks.");

        const admins = await Admin.find({});
        const employees = await Employee.find({});

        // We will seed projects for all admins/companies that have employees
        for (const admin of admins) {
            const companyId = admin._id;
            const companyEmployees = employees.filter(e => e.company && e.company.toString() === companyId.toString());

            if (companyEmployees.length === 0) {
                console.log(`Skipping Admin ${admin.email || admin.username} (no employees assigned to this company).`);
                continue;
            }

            console.log(`Seeding 10 projects for Company: ${admin.name || admin.username} (${admin.email}), ID: ${companyId}. Employees found: ${companyEmployees.length}`);

            const sampleProjects = [
                {
                    title: '🚀 Nexora Core HRMS App Upgrade',
                    description: 'End-to-end upgrade of the enterprise mobile application including interactive Kanban boards, socket-based real-time chat, asset tracking modules, and secure payment pathways.',
                    department: 'Engineering',
                    status: 'In Progress',
                    startDate: new Date('2026-06-01'),
                    deadline: new Date('2026-09-15'),
                    tasks: [
                        { title: 'Figma Mobile Mockups Design', desc: 'Design high-fidelity UI screens for notice board, chat, and projects in Light/Dark theme.', priority: 'High', status: 'Completed' },
                        { title: 'Setup WebSocket Chat Server', desc: 'Implement real-time messaging pipeline using Node.js, Socket.io, and MongoDB Atlas persistence.', priority: 'High', status: 'In Progress' },
                        { title: 'Payslip PDF & WhatsApp Integration', desc: 'Build backend microservice using pdfkit to generate payslips and trigger direct WhatsApp link sharing.', priority: 'Medium', status: 'Todo' },
                        { title: 'Asset Damage Recovery API', desc: 'Implement automated salary deduction and lump-sum recovery endpoints for damaged inventory assets.', priority: 'Medium', status: 'Todo' },
                        { title: 'QA Security Penetration Test', desc: 'Verify role-based security headers, secure session tokens, and route protection rules.', priority: 'High', status: 'Todo' }
                    ]
                },
                {
                    title: '🔒 SOC2 Type II Security Certification',
                    description: 'Prepare company infrastructure, security policies, and user authorization workflows to achieve SOC2 Type II compliance audit.',
                    department: 'IT Security',
                    status: 'In Progress',
                    startDate: new Date('2026-05-10'),
                    deadline: new Date('2026-08-30'),
                    tasks: [
                        { title: 'Draft Security & Access Control Policies', desc: 'Formulate official company security handbook and asset usage guidelines.', priority: 'Medium', status: 'Completed' },
                        { title: 'Enable Database Column Encryption', desc: 'Configure field-level encryption for sensitive employee data (salary, tax credentials).', priority: 'High', status: 'In Progress' },
                        { title: 'Implement Audit Log Middleware', desc: 'Record all critical admin operations (payroll runs, asset deletion, role updates) in a tamper-proof database log.', priority: 'High', status: 'In Progress' },
                        { title: 'Run Automated Vulnerability Scans', desc: 'Utilize automated scanner tools to detect dependency vulnerabilities and open server ports.', priority: 'Medium', status: 'Todo' },
                        { title: 'Mock Compliance Audit Run', desc: 'Perform walkthrough of security controls with external mock auditor to identify gaps.', priority: 'Medium', status: 'Todo' }
                    ]
                },
                {
                    title: '📈 Q3 Brand Scaling & Marketing Sprint',
                    description: 'Revamping corporate brand assets, creating promo videos, launching targeted paid advertising campaigns, and scaling user engagement metrics.',
                    department: 'Marketing',
                    status: 'In Progress',
                    startDate: new Date('2026-07-01'),
                    deadline: new Date('2026-10-31'),
                    tasks: [
                        { title: 'Produce Corporate Video Renders', desc: 'Generate 4K visual promotional clips featuring major product use-cases.', priority: 'Medium', status: 'Completed' },
                        { title: 'Design Landing Page Optimization', desc: 'A/B test modern layouts to maximize visitor-to-lead conversion rates.', priority: 'High', status: 'In Progress' },
                        { title: 'Set Up Google & LinkedIn Ads', desc: 'Launch targeted B2B advertising campaigns with HSL color-themed creatives.', priority: 'High', status: 'Todo' },
                        { title: 'Write Q3 PR Press Releases', desc: 'Draft articles highlighting the new product release for major tech publications.', priority: 'Low', status: 'Todo' },
                        { title: 'Configure GA4 Campaign Tracking', desc: 'Embed analytics hooks to trace marketing funnel traffic and sign-up metrics.', priority: 'Medium', status: 'Todo' }
                    ]
                },
                {
                    title: '💸 Auto-Payroll & Tax Compliance Engine',
                    description: 'Develop backend payroll ledger with auto tax deduction, statutory compliance (PF/ESIC/PT), and direct bank payout gateway.',
                    department: 'Finance',
                    status: 'In Progress',
                    startDate: new Date('2026-07-01'),
                    deadline: new Date('2026-09-30'),
                    tasks: [
                        { title: 'Implement Tax Slab Algorithms', desc: 'Calculate exact TDS deductions based on standard and new tax slabs.', priority: 'High', status: 'In Progress' },
                        { title: 'Setup Bank API Payout Gateway', desc: 'Integrate corporate banking REST APIs for direct-to-bank salary disbursement.', priority: 'High', status: 'Todo' },
                        { title: 'Auto PF & ESIC Contribution Logger', desc: 'Calculate employer and employee provident fund contributions automatically.', priority: 'Medium', status: 'Todo' },
                        { title: 'Payroll Reconciliation Report Tool', desc: 'Generate monthly Excel auditing reports mapping salary sheets with attendance data.', priority: 'Medium', status: 'Todo' }
                    ]
                },
                {
                    title: '🤖 AI-Powered Resume Screener',
                    description: 'Implement an NLP-based recruitment module in the portal that auto-parses candidate resumes and matches them to open job descriptions.',
                    department: 'Human Resources',
                    status: 'Not Started',
                    startDate: new Date('2026-08-01'),
                    deadline: new Date('2026-11-15'),
                    tasks: [
                        { title: 'Build Resume Parser Engine', desc: 'Utilize python-docx and pdfplumber to extract texts, qualifications, and skills from candidate uploads.', priority: 'High', status: 'Todo' },
                        { title: 'Train Keyword Matcher Model', desc: 'Define similarity scoring metrics mapping parsed resumes to active job vacancy requirements.', priority: 'High', status: 'Todo' },
                        { title: 'Integrate Candidate Scorecards UI', desc: 'Build frontend cards displaying candidate ratings, matched keywords, and interview status updates.', priority: 'Medium', status: 'Todo' }
                    ]
                },
                {
                    title: '☁️ Cloud Infrastructure Migration',
                    description: 'Migrate legacy local development and staging servers to Amazon Web Services (AWS) using secure VPC, Auto-Scaling, and load balancers.',
                    department: 'IT Operations',
                    status: 'In Progress',
                    startDate: new Date('2026-04-15'),
                    deadline: new Date('2026-08-15'),
                    tasks: [
                        { title: 'Configure AWS VPC & Security Groups', desc: 'Draft network subnetting layout and setup firewall rules restricting database port access.', priority: 'High', status: 'Completed' },
                        { title: 'Setup MongoDB Atlas Cloud VPC Peering', desc: 'Enable secure internal AWS peering with Atlas server nodes to avoid public web requests.', priority: 'High', status: 'Completed' },
                        { title: 'Dockerize Backend Services', desc: 'Write multi-stage Dockerfiles and compose setups for modular microservices.', priority: 'Medium', status: 'In Progress' },
                        { title: 'CI/CD Pipeline Setup (GitHub Actions)', desc: 'Deploy automated test execution and build image pushes on every git push to main.', priority: 'High', status: 'Todo' }
                    ]
                },
                {
                    title: '📞 Customer Support CRM Integration',
                    description: 'Connect external Zendesk and HubSpot ticketing pipelines with the internal helpdesk ticket management system to streamline agent responses.',
                    department: 'Sales & Support',
                    status: 'Not Started',
                    startDate: new Date('2026-08-15'),
                    deadline: new Date('2026-11-30'),
                    tasks: [
                        { title: 'API Webhook Setup with HubSpot', desc: 'Configure instant webhooks to sync ticket creation, comment additions, and ticket closures.', priority: 'High', status: 'Todo' },
                        { title: 'Agent Performance Leaderboard', desc: 'Design UI charts showing ticket turnaround metrics and average client rating scores.', priority: 'Medium', status: 'Todo' }
                    ]
                },
                {
                    title: '💡 Employee L&D Portal Integration',
                    description: 'Create structured learning paths for React Native, Node.js development, and Docker orchestration with online progress tracking.',
                    department: 'L&D & Training',
                    status: 'In Progress',
                    startDate: new Date('2026-06-15'),
                    deadline: new Date('2026-10-15'),
                    tasks: [
                        { title: 'Curate Course Syllabus & Videos', desc: 'Gather internal engineering slides, documentation, and external courses for mobile devs.', priority: 'Medium', status: 'Completed' },
                        { title: 'Develop Course Quiz Engine', desc: 'Build questionnaire portal allowing employees to answer tests and earn certificates.', priority: 'Medium', status: 'In Progress' },
                        { title: 'Generate Certificate PDF Creator', desc: 'Autogenerate digital completion certificates signed by L&D Manager upon passing course.', priority: 'Low', status: 'Todo' }
                    ]
                },
                {
                    title: '🏥 Wellness & Family Health Insurance Revamp',
                    description: 'Collaborate with top-tier insurance partners to roll out a customizable family healthcare package and weekly fitness challenges.',
                    department: 'HR Operations',
                    status: 'Completed',
                    startDate: new Date('2026-01-01'),
                    deadline: new Date('2026-05-30'),
                    tasks: [
                        { title: 'Negotiate Insurance Policy Quotes', desc: 'Discuss premium pricing and features with top insurance providers for 150+ staff.', priority: 'High', status: 'Completed' },
                        { title: 'Enrollment Portal Development', desc: 'Build employee application forms to add dependents and download digital health cards.', priority: 'High', status: 'Completed' },
                        { title: 'Launch Fitness Challenge App Module', desc: 'Setup leaderboard showing daily step counts sync using Google Fit / Apple Health APIs.', priority: 'Medium', status: 'Completed' }
                    ]
                },
                {
                    title: '📦 Centralized IT Asset Procurement',
                    description: 'Establish automated asset workflows to buy, catalogue, verify, and deprecate laptops, accessories, and testing devices.',
                    department: 'Procurement',
                    status: 'In Progress',
                    startDate: new Date('2026-05-01'),
                    deadline: new Date('2026-09-30'),
                    tasks: [
                        { title: 'Integrate Vendor Request System', desc: 'Enable HR to request quote catalogs from pre-approved tech hardware suppliers.', priority: 'Medium', status: 'Completed' },
                        { title: 'Setup Asset Barcode Auto-Generator', desc: 'Automatically generate QR codes for each asset on addition for fast barcode audits.', priority: 'Medium', status: 'In Progress' },
                        { title: 'Inventory Alert Notification Thresholds', desc: 'Send alerts to IT desk when stock of spare mouse, monitors or keyboard drops below 5 units.', priority: 'Low', status: 'Todo' }
                    ]
                }
            ];

            for (let i = 0; i < sampleProjects.length; i++) {
                const pTpl = sampleProjects[i];

                // Assign roles using available company employees
                const manager = companyEmployees[i % companyEmployees.length];
                const lead = companyEmployees[(i + 1) % companyEmployees.length];
                
                // Select up to 5 members
                const members = companyEmployees.slice(0, Math.min(companyEmployees.length, 5)).map(e => e._id);

                const prj = new Project({
                    company: companyId,
                    title: pTpl.title,
                    description: pTpl.description,
                    department: pTpl.department,
                    status: pTpl.status,
                    startDate: pTpl.startDate,
                    deadline: pTpl.deadline,
                    projectManager: manager._id,
                    teamLead: lead._id,
                    members: members,
                    createdBy: companyId
                });

                const savedPrj = await prj.save();
                console.log(`  - Seeded Project: "${savedPrj.title}"`);

                // Seed Tasks for this Project
                for (let j = 0; j < pTpl.tasks.length; j++) {
                    const tTpl = pTpl.tasks[j];
                    const assignee = companyEmployees[(i + j) % companyEmployees.length];

                    const task = new Task({
                        company: companyId,
                        project: savedPrj._id,
                        title: tTpl.title,
                        description: tTpl.desc,
                        status: tTpl.status,
                        priority: tTpl.priority,
                        assignedTo: assignee._id,
                        deadline: new Date(Date.now() + (j + 1) * 86400000 * 3),
                        createdBy: lead._id
                    });

                    await task.save();
                }
                console.log(`    - Seeded ${pTpl.tasks.length} tasks for "${savedPrj.title}"`);
            }
        }

        console.log("🚀 Seeding completed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding projects/tasks:", e);
        process.exit(1);
    }
}

run();
