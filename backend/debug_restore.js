const mongoose = require('mongoose');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const NEXORA_ID = '6a1fdfcc0a3c320a2def2aa9';
const QUANTUM_ID = '6a4b5e6d00b07c1dfa2c3789';

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const db = mongoose.connection.db;
        const adminsColl = db.collection('admins');

        // 1. Ensure Quantum Admin exists
        let quantumAdmin = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(QUANTUM_ID) });
        if (!quantumAdmin) {
            console.log("Creating Quantum Admin for debugging...");
            const hashedPassword = await bcrypt.hash("Password123", 10);
            quantumAdmin = {
                _id: new mongoose.Types.ObjectId(QUANTUM_ID),
                adminId: "AD-003",
                name: "Alan Turing",
                email: "turing@quantumanalyticscorp.com",
                password: hashedPassword,
                phone: "9765432109",
                companyName: "Quantum Analytics Corp",
                companyType: "MNC",
                industryType: "Data Science & AI",
                companyStartDate: new Date("2023-08-20"),
                selectedPlanName: "Plus",
                planPrice: "4999",
                status: "Active",
                hasPaidTier: true,
                employeeQuotaTarget: 50,
                departmentQuotaTarget: 10,
                storageQuotaTarget: 20,
                address: "Cyber City Towers, Sector 45",
                city: "Gurugram",
                state: "Haryana",
                pinCode: "122003",
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await adminsColl.insertOne(quantumAdmin);
        }

        // Check it exists
        let check = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(QUANTUM_ID) });
        console.log(`Initial check: Quantum admin exists? ${!!check}`);

        // Read backup file content
        const backupPath = 'backend/backups/Quantum_Analytics_Corp_Backup.json';
        const rawJsonStr = fs.readFileSync(backupPath, 'utf-8');
        const parsedData = JSON.parse(rawJsonStr);

        const models = {
            employees: { Model: require('./models/Employee'), query: { company: QUANTUM_ID } },
            departments: { Model: require('./models/Department'), query: { company: QUANTUM_ID } },
            designations: { Model: require('./models/Designation'), query: { company: QUANTUM_ID } },
            customRoles: { Model: require('./models/CustomRole'), query: { company: QUANTUM_ID } },
            holidays: { Model: require('./models/Holiday'), query: { company: QUANTUM_ID } },
            leavePolicies: { Model: require('./models/LeavePolicy'), query: { company: QUANTUM_ID } },
            leaves: { Model: require('./models/Leave'), query: { company: QUANTUM_ID } },
            attendances: { Model: require('./models/Attendance'), query: { company: QUANTUM_ID } },
            payslips: { Model: require('./models/Payslip'), query: { company: QUANTUM_ID } },
            assets: { Model: require('./models/Asset'), query: { company: QUANTUM_ID } },
            expenses: { Model: require('./models/Expense'), query: { company: QUANTUM_ID } },
            projects: { Model: require('./models/Project'), query: { company: QUANTUM_ID } },
            tasks: { Model: require('./models/Task'), query: { company: QUANTUM_ID } },
            announcements: { Model: require('./models/Announcement'), query: { createdBy: QUANTUM_ID } },
            events: { Model: require('./models/Event'), query: { company: QUANTUM_ID } }
        };

        // Trace deleteMany
        for (const [key, config] of Object.entries(models)) {
            console.log(`Running deleteMany for ${key}...`);
            await config.Model.deleteMany(config.query);
            check = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(QUANTUM_ID) });
            if (!check) {
                console.log(`🚨 ALERT! Quantum admin was deleted during deleteMany of "${key}"!`);
                process.exit(1);
            }
        }

        // Trace insertMany
        for (const [key, config] of Object.entries(models)) {
            if (parsedData[key] && Array.isArray(parsedData[key]) && parsedData[key].length > 0) {
                console.log(`Running insertMany for ${key} (${parsedData[key].length} records)...`);
                try {
                    await config.Model.insertMany(parsedData[key], { ordered: false });
                } catch (err) {
                    // Ignore duplicate key errors
                }
                check = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(QUANTUM_ID) });
                if (!check) {
                    console.log(`🚨 ALERT! Quantum admin was deleted during insertMany of "${key}"!`);
                    process.exit(1);
                }
            }
        }

        // Trace Admin update
        if (parsedData.company) {
            console.log("Updating Admin profile settings...");
            const AdminModel = require('./models/Admin');
            const companyDoc = { ...parsedData.company };
            delete companyDoc._id;
            
            console.log("Document to update with: ", JSON.stringify(companyDoc, null, 2));
            
            const result = await AdminModel.findByIdAndUpdate(QUANTUM_ID, companyDoc, { new: true });
            console.log("Mongoose findByIdAndUpdate result: ", result);
            
            check = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(QUANTUM_ID) });
            console.log(`After findByIdAndUpdate check: Quantum admin exists? ${!!check}`);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error tracing restore:", e);
        process.exit(1);
    }
}
run();
