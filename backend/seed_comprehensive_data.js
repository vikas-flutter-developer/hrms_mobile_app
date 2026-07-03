const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Load models
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');
const AttendanceRegularization = require('./models/AttendanceRegularization');
const Leave = require('./models/Leave');
const Holiday = require('./models/Holiday');
const Payslip = require('./models/Payslip');
const Loan = require('./models/Loan');
const Expense = require('./models/Expense');
const Ticket = require('./models/Ticket');
const Message = require('./models/Message');
const Asset = require('./models/Asset');
const AssetRequest = require('./models/AssetRequest');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        // 1. Get Admin & Test Employee
        const admin = await Admin.findOne({ email: 'admin@nexora.in' });
        if (!admin) {
            console.error("Admin account 'admin@nexora.in' not found! Make sure you seed test accounts first.");
            process.exit(1);
        }
        admin.employeeQuotaTarget = 100;
        await admin.save();
        console.log(`Using Admin: ${admin.name} (${admin._id}) - Quota set to 100`);

        let emp = await Employee.findOne({ email: 'emp@test.com' });
        if (!emp) {
            console.log("Creating test employee: emp@test.com");
            const empPasswordHash = await bcrypt.hash('password123', 10);
            emp = new Employee({
                company: admin._id,
                empId: 'EMP001',
                name: 'Rahul Sharma',
                firstName: 'Rahul',
                lastName: 'Sharma',
                gender: 'Male',
                email: 'emp@test.com',
                password: empPasswordHash,
                department: 'Engineering',
                designation: 'Senior Software Engineer',
                dateOfJoining: new Date(),
                status: 'Active',
                phone: '+919999999999',
                leaveBalances: { casual: 12, medical: 10, paid: 15 }
            });
            await emp.save();
        } else {
            console.log(`Using Test Employee: ${emp.name} (${emp._id})`);
        }

        const companyId = admin._id;
        const employeeId = emp._id;

        // Clean existing test data to avoid duplication/bloat
        console.log("Cleaning up old test data...");
        await Employee.deleteMany({ company: companyId, email: { $ne: 'emp@test.com' } });
        await Attendance.deleteMany({ employeeId });
        await AttendanceRegularization.deleteMany({ employee: employeeId });
        await Leave.deleteMany({ company: companyId });
        await Holiday.deleteMany({ company: companyId });
        await Payslip.deleteMany({ employeeId });
        await Loan.deleteMany({ employeeId });
        await Expense.deleteMany({ employeeId });
        await Ticket.deleteMany({ employeeId });
        await Message.deleteMany({ company: companyId });
        await Asset.deleteMany({ company: companyId });
        await AssetRequest.deleteMany({ company: companyId });
        console.log("Cleaned old records.");

        // --- 1. Teammates / Directory (15 Employees) ---
        console.log("Seeding Directory / Teammates...");
        const employeeNames = [
            { name: "Aarav Sharma", email: "aarav@test.com", dept: "Engineering", role: "Software Engineer", gender: "Male" },
            { name: "Aditi Rao", email: "aditi@test.com", dept: "HR", role: "HR Specialist", gender: "Female" },
            { name: "Karan Johar", email: "karan@test.com", dept: "Marketing", role: "Marketing Analyst", gender: "Male" },
            { name: "Riya Sen", email: "riya@test.com", dept: "Design", role: "UI Designer", gender: "Female" },
            { name: "Siddharth Kapoor", email: "sid@test.com", dept: "Sales", role: "Sales Manager", gender: "Male" },
            { name: "Ananya Pandey", email: "ananya@test.com", dept: "Engineering", role: "Frontend Developer", gender: "Female" },
            { name: "Varun Dhawan", email: "varun@test.com", dept: "Marketing", role: "PR Coordinator", gender: "Male" },
            { name: "Kiara Advani", email: "kiara@test.com", dept: "HR", role: "Recruiter", gender: "Female" },
            { name: "Ishaan Khatter", email: "ishaan@test.com", dept: "Engineering", role: "QA Engineer", gender: "Male" },
            { name: "Sara Ali Khan", email: "sara@test.com", dept: "Design", role: "UX Researcher", gender: "Female" },
            { name: "Deepika Padukone", email: "deepika@test.com", dept: "Product", role: "Product Manager", gender: "Female" },
            { name: "Ranveer Singh", email: "ranveer@test.com", dept: "Sales", role: "Sales Executive", gender: "Male" },
            { name: "Alia Bhatt", email: "alia@test.com", dept: "Engineering", role: "Technical Writer", gender: "Female" },
            { name: "Ranbir Kapoor", email: "ranbir@test.com", dept: "Engineering", role: "DevOps Lead", gender: "Male" },
            { name: "Kritika Kamra", email: "kritika@test.com", dept: "Engineering", role: "Full Stack Developer", gender: "Female" }
        ];

        const seededEmployees = [];
        const hashedPw = await bcrypt.hash('password123', 10);
        for (let i = 0; i < employeeNames.length; i++) {
            const data = employeeNames[i];
            const e = new Employee({
                company: companyId,
                empId: `EMP10${i + 2}`,
                name: data.name,
                firstName: data.name.split(' ')[0],
                lastName: data.name.split(' ')[1],
                gender: data.gender,
                email: data.email,
                password: hashedPw,
                department: data.dept,
                designation: data.role,
                status: 'Active',
                phone: `+91987654321${i}`,
                leaveBalances: { casual: 10, medical: 8, paid: 12 }
            });
            await e.save();
            seededEmployees.push(e);
        }
        console.log("Seeded 10 Employees.");

        // --- 2. Attendance logs for ALL Employees (July 2026 & June 2026) ---
        console.log("Seeding Attendance History Logs for all employees...");
        await Attendance.deleteMany({ company: companyId });
        const allTargetEmps = [emp, ...seededEmployees];
        const statusPool = ['Present', 'Present', 'Present', 'Late', 'Present', 'Present', 'Leave', 'Present', 'Half-Day', 'Present', 'Present', 'Present', 'Absent', 'Present', 'Present'];

        for (const targetEmp of allTargetEmps) {
            // July 2026 (Days 1 to 15)
            for (let day = 1; day <= 15; day++) {
                const dayStr = String(day).padStart(2, '0');
                const dateStr = `2026-07-${dayStr}`;
                const status = statusPool[(day + targetEmp.name.length) % statusPool.length];

                const att = new Attendance({
                    company: companyId,
                    employeeId: targetEmp._id,
                    date: dateStr,
                    checkIn: status === 'Present' ? "09:05 AM" : (status === 'Late' ? "10:20 AM" : (status === 'Half-Day' ? "09:00 AM" : (status === 'Leave' || status === 'Absent' ? "" : "09:15 AM"))),
                    checkOut: status === 'Half-Day' ? "01:30 PM" : (status === 'Leave' || status === 'Absent' ? "" : "06:05 PM"),
                    hoursWorked: status === 'Half-Day' ? 4.5 : (status === 'Leave' || status === 'Absent' ? 0 : 8.5),
                    overtimeHours: (day % 4 === 0 && status === 'Present') ? 1.5 : 0,
                    status: status,
                    checkInMethod: 'Mobile',
                    checkOutMethod: 'Mobile'
                });
                await att.save();
            }

            // June 2026 (Days 1 to 20)
            for (let day = 1; day <= 20; day++) {
                const dayStr = String(day).padStart(2, '0');
                const dateStr = `2026-06-${dayStr}`;
                const status = statusPool[(day + targetEmp.name.length + 2) % statusPool.length];

                const att = new Attendance({
                    company: companyId,
                    employeeId: targetEmp._id,
                    date: dateStr,
                    checkIn: status === 'Present' ? "09:00 AM" : (status === 'Late' ? "10:15 AM" : (status === 'Half-Day' ? "09:00 AM" : (status === 'Leave' || status === 'Absent' ? "" : "09:10 AM"))),
                    checkOut: status === 'Half-Day' ? "01:30 PM" : (status === 'Leave' || status === 'Absent' ? "" : "06:00 PM"),
                    hoursWorked: status === 'Half-Day' ? 4.5 : (status === 'Leave' || status === 'Absent' ? 0 : 8.0),
                    overtimeHours: (day % 5 === 0 && status === 'Present') ? 2.0 : 0,
                    status: status,
                    checkInMethod: 'Mobile',
                    checkOutMethod: 'Mobile'
                });
                await att.save();
            }
        }
        console.log("Seeded comprehensive attendance records for all employees.");

        // --- 3. Attendance Regularizations (10 items) ---
        console.log("Seeding Attendance Regularizations...");
        const regularizationReasons = [
            "Forgot to swipe card at gate scanner",
            "Biometric device server database sync error",
            "Client site integration deployment check",
            "Train delays due to waterlogging of tracks",
            "Broadband router failure at home office",
            "External vendor consultation onsite visit",
            "Out of office for hardware procurement",
            "Emergency hospital visit in morning",
            "Client demo run and presentation prep",
            "Local power outage during morning shifts"
        ];
        const regStatuses = ['Pending', 'Approved', 'Rejected', 'Pending', 'Approved', 'Approved', 'Pending', 'Rejected', 'Approved', 'Pending'];
        for (let i = 0; i < 10; i++) {
            const date = new Date();
            date.setDate(date.getDate() - (i + 15));

            const reg = new AttendanceRegularization({
                company: companyId,
                employee: employeeId,
                date: date,
                requestedStatus: i % 3 === 0 ? 'Half-Day' : 'Present',
                reason: regularizationReasons[i],
                status: regStatuses[i],
                reviewedBy: regStatuses[i] !== 'Pending' ? companyId : null,
                reviewNote: regStatuses[i] === 'Approved' ? 'Verified request' : (regStatuses[i] === 'Rejected' ? 'Insufficient proof provided' : ''),
                actionedByName: regStatuses[i] !== 'Pending' ? 'Admin Team' : ''
            });
            await reg.save();
        }
        console.log("Seeded 10 Regularizations.");

        // --- 4. Leave requests (10 items for Staff Employees) ---
        console.log("Seeding Leave Requests...");
        const leaveTypes = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Comp-off'];
        const leaveReasons = [
            "Family wedding function at home town",
            "Suffering from severe viral fever",
            "Personal emergency at native village",
            "Resting due to acute migraine",
            "Post dental treatment extraction rest",
            "Urgent real estate document registration",
            "Daughter school annual day attendance",
            "Traveling to collect college certificates",
            "Resting due to muscular back sprain",
            "Renewal of passport and visa interview"
        ];
        const leaveStatuses = ['Pending', 'Approved', 'Rejected', 'Approved', 'Rejected', 'Pending', 'Approved', 'Approved', 'Pending', 'Approved'];
        for (let i = 0; i < 10; i++) {
            const start = new Date();
            start.setDate(start.getDate() + (i + 1) * 3);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);

            const targetEmp = seededEmployees[i % seededEmployees.length];
            const lvEmp = new Leave({
                company: companyId,
                employeeId: targetEmp._id,
                employeeRole: 'employee',
                type: leaveTypes[i % leaveTypes.length],
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                days: 2,
                reason: leaveReasons[i],
                status: leaveStatuses[i],
                isLOP: false,
                actionedByName: leaveStatuses[i] !== 'Pending' ? 'Admin Team' : ''
            });
            await lvEmp.save();
        }
        console.log("Seeded 10 Staff Leave Requests across team members.");

        // --- 5. Company Holidays (10 items) ---
        console.log("Seeding Company Holidays...");
        const holidayList = [
            { name: "New Year Day", date: "2026-01-01", type: "Optional" },
            { name: "Republic Day", date: "2026-01-26", type: "National" },
            { name: "Maha Shivratri", date: "2026-03-06", type: "Regional" },
            { name: "Holi Festival", date: "2026-03-07", type: "Optional" },
            { name: "Good Friday", date: "2026-04-10", type: "National" },
            { name: "Labor Day / Maharashtra Day", date: "2026-05-01", type: "Regional" },
            { name: "Independence Day", date: "2026-08-15", type: "National" },
            { name: "Ganesh Chaturthi", date: "2026-09-08", type: "Regional" },
            { name: "Gandhi Jayanti", date: "2026-10-02", type: "National" },
            { name: "Diwali Festival", date: "2026-11-09", type: "National" }
        ];
        for (let i = 0; i < holidayList.length; i++) {
            const h = new Holiday({
                company: companyId,
                name: holidayList[i].name,
                date: holidayList[i].date,
                type: holidayList[i].type,
                description: "Corporate paid holiday",
                isActive: true
            });
            await h.save();
        }
        console.log("Seeded 10 Holidays.");

        // --- 6. Payslips (10 items for Staff Employees and Employee) ---
        console.log("Seeding Payslips...");
        const months = ["May 2026", "April 2026", "March 2026", "February 2026", "January 2026", "December 2025", "November 2025", "October 2025", "September 2025", "August 2025"];
        for (let i = 0; i < 10; i++) {
            const targetEmp = seededEmployees[i % seededEmployees.length];
            const psStaff = new Payslip({
                company: companyId,
                employeeId: targetEmp._id,
                month: months[i % months.length],
                basicPay: 45000 + i * 1000,
                hra: 15000,
                da: 2500,
                specialAllowance: 6500,
                bonus: i === 0 ? 5000 : 0,
                incentives: i % 2 === 0 ? 2500 : 0,
                gratuity: 0,
                overtimePay: i % 3 === 0 ? 1200 : 0,
                pfDeduction: 5200,
                esiDeduction: 1200,
                professionalTax: 200,
                tds: 1800,
                lopDeduction: 0,
                loanEmi: i < 3 ? 3000 : 0,
                netPay: 60000 + (i * 1000),
                status: 'Paid',
                paymentDate: new Date()
            });
            await psStaff.save();

            const psEmp = new Payslip({
                company: companyId,
                employeeId: employeeId,
                month: months[i],
                basicPay: 40000,
                hra: 12000,
                da: 2000,
                specialAllowance: 6000,
                bonus: i === 0 ? 5000 : 0,
                incentives: i % 2 === 0 ? 2500 : 0,
                gratuity: 0,
                overtimePay: i % 3 === 0 ? 1200 : 0,
                pfDeduction: 4800,
                esiDeduction: 1200,
                professionalTax: 200,
                tds: 1500,
                lopDeduction: 0,
                loanEmi: i < 3 ? 3000 : 0,
                netPay: 55000 + (i % 2 === 0 ? 2500 : 0) - (i < 3 ? 3000 : 0),
                status: 'Paid',
                paymentDate: new Date()
            });
            await psEmp.save();
        }
        console.log("Seeded 10 Staff Payslips and 10 Employee Payslips.");

        // --- 7. Advances & Loans (10 items) ---
        console.log("Seeding Advances & Loans...");
        const loanReasons = [
            "Medical treatment for parents",
            "Emergency two-wheeler engine overhaul",
            "Rental lease security deposit advance",
            "Higher education course enrollment",
            "Purchasing home electronic appliances",
            "Family pilgrimage travel expense",
            "Sister wedding gift purchase",
            "Home water purification system repair",
            "Purchase of professional digital tablet",
            "Emergency savings fund replenishment"
        ];
        const loanStatuses = ['Pending', 'Approved', 'Closed', 'Rejected', 'Approved', 'Pending', 'Closed', 'Rejected', 'Approved', 'Pending'];
        for (let i = 0; i < 10; i++) {
            const ln = new Loan({
                company: companyId,
                employeeId: employeeId,
                amount: (i + 1) * 10000,
                reason: loanReasons[i],
                emiAmount: (i + 1) * 1000,
                balanceRemaining: loanStatuses[i] === 'Closed' ? 0 : (i + 1) * 6000,
                status: loanStatuses[i],
                approvedBy: loanStatuses[i] !== 'Pending' ? companyId : null,
                disbursementDate: loanStatuses[i] === 'Approved' || loanStatuses[i] === 'Closed' ? new Date() : null
            });
            await ln.save();
        }
        console.log("Seeded 10 Loans.");

        // --- 8. Expense Claims (10 items) ---
        console.log("Seeding Expense Claims...");
        const expCategories = ['Travel', 'Food', 'Office Supplies', 'Accommodation', 'Other'];
        const expDescs = [
            "Uber taxi rides to client site office",
            "Team dinner at Olive Grill for project completion",
            "A4 bundle papers and whiteboard markers",
            "Single night hotel stay for conference",
            "USB-C to HDMI adapter dongle",
            "Courier services for client documentation",
            "Client lunch meeting at Taj Cafe",
            "Broadband internet reimbursement request",
            "High-speed mouse wireless logitech",
            "Cables, extensions, and hardware sockets"
        ];
        const expStatuses = ['Pending', 'Approved', 'Rejected', 'Reimbursed', 'Pending', 'Approved', 'Reimbursed', 'Pending', 'Rejected', 'Approved'];
        for (let i = 0; i < 10; i++) {
            const ex = new Expense({
                company: companyId,
                employeeId: employeeId,
                category: expCategories[i % expCategories.length],
                amount: (i + 1) * 500,
                dateIncurred: new Date(),
                description: expDescs[i],
                status: expStatuses[i],
                approvedBy: expStatuses[i] !== 'Pending' ? employeeId : null
            });
            await ex.save();
        }
        console.log("Seeded 10 Expense Claims.");

        // --- 9. Support Tickets (10 items) ---
        console.log("Seeding Support Tickets...");
        const ticketSubjects = [
            "Failing Outlook login authentication",
            "Setup of local office VPN keys",
            "Air conditioner not functioning in cabin",
            "Salary advance deduction queries",
            "Lost proximity card access swipe key",
            "Ergonomic computer screen riser request",
            "Permissions to access github organization",
            "Biometric fingerprint device sync issue",
            "Allotment of ground floor parking slot",
            "Health insurance claim submission help"
        ];
        const ticketCategories = ["IT Support", "IT Support", "Facilities", "Finance", "Facilities", "Facilities", "IT Support", "IT Support", "Facilities", "HR Query"];
        const ticketStatuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'Open', 'In Progress', 'Resolved', 'Open', 'Closed', 'Resolved'];
        const ticketPriorities = ['Medium', 'High', 'Low', 'Medium', 'High', 'Low', 'High', 'Urgent', 'Low', 'Medium'];
        for (let i = 0; i < 10; i++) {
            const tk = new Ticket({
                company: companyId,
                employeeId: employeeId,
                employeeModel: 'Employee',
                isSuperAdminTicket: false,
                subject: ticketSubjects[i],
                category: ticketCategories[i],
                description: `This is a descriptive ticket detailing issues related to: ${ticketSubjects[i]}. Action is requested.`,
                priority: ticketPriorities[i],
                status: ticketStatuses[i],
                resolutionNotes: ticketStatuses[i] === 'Resolved' || ticketStatuses[i] === 'Closed' ? 'Resolved by resetting keys and assigning slot.' : '',
                resolvedAt: ticketStatuses[i] === 'Resolved' || ticketStatuses[i] === 'Closed' ? new Date() : null
            });
            await tk.save();
        }
        console.log("Seeded 10 Support Tickets.");

        // --- 10. Global Live Chat Messages (10 items) ---
        console.log("Seeding Chat Messages...");
        const chatMsgs = [
            "Good morning team! Hope everyone has a great week ahead.",
            "Reminder to submit regularization requests before 5 PM today.",
            "Congratulations to Rahul for completing the architecture setup!",
            "Can someone share the Zoom invite link for the client call?",
            "I have posted the updated design wireframes in the group.",
            "Sure, here is the link: zoom.us/j/9876543210. Joining now.",
            "WiFi network 'Nexora_Corp' is back online. Please connect.",
            "Excellent! Thanks IT support team for the quick resolution.",
            "Does anyone want to join for client lunch at Taj cafe?",
            "I'm in! Let's head downstairs in 10 minutes."
        ];
        for (let i = 0; i < chatMsgs.length; i++) {
            const m = new Message({
                company: companyId,
                sender: employeeId,
                senderModel: 'Employee',
                content: chatMsgs[i],
                isGlobal: true
            });
            await m.save();
        }
        console.log("Seeded 10 Chat Messages.");

        // --- 11. My Assets (10 items) ---
        console.log("Seeding My Assets...");
        const assetNames = [
            "MacBook Pro 14", "Dell Latitude 5420", "Samsung 27 Monitor", "Logitech MX Master 3", "Apple iPad Air",
            "iPhone 15 Pro", "Jabra Evolve 65 Headset", "ThinkPad T14", "Lenovo USB-C Dock", "Ergonomic Office Chair"
        ];
        const assetCategories = ["Laptops", "Laptops", "Monitors", "Accessories", "Mobiles", "Mobiles", "Accessories", "Laptops", "Accessories", "Furniture"];
        for (let i = 0; i < 10; i++) {
            const a = new Asset({
                company: companyId,
                name: assetNames[i],
                category: assetCategories[i],
                serialNumber: `SN-TEST-ASSET-${i + 100}`,
                assignedTo: employeeId,
                issueDate: new Date(),
                condition: 'New',
                status: 'Assigned',
                purchaseValue: (i + 1) * 15000,
                depreciationRate: 15,
                nextMaintenanceDate: new Date()
            });
            await a.save();
        }
        console.log("Seeded 10 Assets.");

        // --- 12. Asset Requests (10 items) ---
        console.log("Seeding Asset Requests...");
        const requestReasons = [
            "Need dual monitors for layout reviews",
            "Laptop battery health below 50 percent",
            "Wireless mouse has scrolling lag",
            "Testing mobile builds on iOS real devices",
            "Office desk chair padding worn out",
            "Need dock to connect multi peripherals",
            "External webcam for remote calls quality",
            "MacBook screen backlight flickering",
            "Headset microphone cuts out during meetings",
            "Additional keyboard mechanical style request"
        ];
        const reqTypes = ["Monitor", "Laptop", "Mouse", "iPhone", "Chair", "USB-C Hub", "Webcam", "Laptop", "Headset", "Keyboard"];
        const reqStatuses = ['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Pending', 'Approved', 'Fulfilled', 'Pending', 'Rejected', 'Approved'];
        for (let i = 0; i < 10; i++) {
            const ar = new AssetRequest({
                company: companyId,
                employeeId: employeeId,
                assetType: reqTypes[i],
                reason: requestReasons[i],
                urgency: i % 3 === 0 ? 'Urgent' : 'Normal',
                status: reqStatuses[i],
                adminNotes: reqStatuses[i] === 'Approved' || reqStatuses[i] === 'Fulfilled' ? 'Approved by admin team' : ''
            });
            await ar.save();
        }
        console.log("Seeded 10 Asset Requests.");

        console.log("🎉 SUCCESS: Comprehensive test data fully seeded in Database!");
        process.exit(0);
    } catch (e) {
        console.error("Error running seeder script:", e);
        process.exit(1);
    }
}
run();
