const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const Admin = require('../models/Admin');
const Ticket = require('../models/Ticket');
const Faq = require('../models/Faq');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hrms";

const faqs = [
    { question: 'How to reset password?', answer: 'Go to Settings -> Security and click Reset Password. Or ask SuperAdmin.', category: 'General' },
    { question: 'Why is my payroll PDF blank?', answer: 'Check if you generated payroll for the correct month and that your company has enabled PDF generation in the portal settings.', category: 'Payroll' },
    { question: 'How do I add a new custom role?', answer: 'Go to Access Control -> Role Matrix, click "Create New Role" and select "Company Scope".', category: 'General' }
];

async function seedHelpdesk() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        const company = await Admin.findOne();
        if (!company) {
            console.log("No company found to associate tickets with. Please create a company first.");
            process.exit(1);
        }

        const tickets = [
            {
                company: company._id,
                employeeId: company._id,
                employeeModel: 'Admin',
                isSuperAdminTicket: true,
                category: 'Billing',
                priority: 'High',
                status: 'Open',
                subject: 'Invoice for March 2024 is incorrect',
                description: 'The invoice we received shows ₹24,999 but our plan is Plus (₹5,999). Please rectify this immediately as accounting is blocked.',
                thread: []
            },
            {
                company: company._id,
                employeeId: company._id,
                employeeModel: 'Admin',
                isSuperAdminTicket: true,
                category: 'Attendance',
                priority: 'Medium',
                status: 'In Progress',
                subject: 'QR Scanner not working on Android',
                description: 'Our field employees use Android 12 devices. The QR attendance scanner launches but freezes after the camera preview shows. iOS works fine.',
                thread: [{
                    senderId: "000000000000000000000000",
                    senderModel: 'SuperAdmin',
                    message: 'Thanks for reporting. We have identified a camera permission race condition in Android 12. A patch will go out in v2.1.4 within 48 hours.'
                }]
            },
            {
                company: company._id,
                employeeId: company._id,
                employeeModel: 'Admin',
                isSuperAdminTicket: true,
                category: 'SSO / Login',
                priority: 'Low',
                status: 'Resolved',
                subject: 'Google SSO redirect loop',
                description: 'Post the SSO configuration, clicking "Sign in with Google" redirects back to our login page in a loop without completing authentication.',
                resolvedAt: new Date(),
                thread: [
                    {
                        senderId: "000000000000000000000000",
                        senderModel: 'SuperAdmin',
                        message: 'The SAML redirect URI was incorrect in your SSO config. I have updated it to https://finedge.com/auth/callback. Please test.',
                        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
                    },
                    {
                        senderId: company._id,
                        senderModel: 'Admin',
                        message: 'Confirmed working! Thank you for the quick fix.',
                        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000)
                    }
                ]
            }
        ];

        // Clear existing just in case
        await Ticket.deleteMany({ isSuperAdminTicket: true });
        await Faq.deleteMany();

        await Ticket.insertMany(tickets);
        await Faq.insertMany(faqs);

        console.log("Seeded Helpdesk Tickets and FAQs successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to seed helpdesk:", err);
        process.exit(1);
    }
}

seedHelpdesk();
