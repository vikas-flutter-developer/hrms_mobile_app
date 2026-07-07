const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
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

        // Check if Nexora exists
        const nexoraAdmin = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(NEXORA_ID) });
        if (!nexoraAdmin) {
            console.error("❌ Nexora Technologies (6a1fdfcc0a3c320a2def2aa9) not found in Database!");
            process.exit(1);
        }

        // Check or Re-create Quantum Admin
        let quantumAdmin = await adminsColl.findOne({ _id: new mongoose.Types.ObjectId(QUANTUM_ID) });
        if (!quantumAdmin) {
            console.log("Creating Quantum Analytics Corp admin record...");
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
            console.log("Quantum Analytics Corp admin record created successfully!");
        } else {
            console.log("Quantum Analytics Corp admin record already exists.");
        }

        console.log("Fetching Nexora Technologies data...");
        const collections = [
            'employees',
            'departments',
            'designations',
            'customroles',
            'holidays',
            'leavepolicies',
            'leaves',
            'attendances',
            'payslips',
            'assets',
            'expenses',
            'projects',
            'tasks',
            'announcements',
            'events'
        ];

        const exportData = {
            companyId: QUANTUM_ID,
            exportedAt: new Date().toISOString(),
            company: quantumAdmin
        };

        for (const colName of collections) {
            const coll = db.collection(colName);
            let query = {};
            if (colName === 'announcements') {
                query = { createdBy: new mongoose.Types.ObjectId(NEXORA_ID) };
            } else {
                query = { company: new mongoose.Types.ObjectId(NEXORA_ID) };
            }
            const docs = await coll.find(query).toArray();
            console.log(`- ${colName}: found ${docs.length} records`);

            // Map IDs from Nexora to Quantum
            const mappedDocs = docs.map(doc => {
                const cloned = { ...doc };
                if (cloned.company && cloned.company.toString() === NEXORA_ID) {
                    cloned.company = new mongoose.Types.ObjectId(QUANTUM_ID);
                }
                if (cloned.createdBy && cloned.createdBy.toString() === NEXORA_ID) {
                    cloned.createdBy = new mongoose.Types.ObjectId(QUANTUM_ID);
                }
                return cloned;
            });

            const apiKey = colName === 'customroles' ? 'customRoles' : colName;
            exportData[apiKey] = mappedDocs;
        }

        // Write backup JSON to a file in backend/backups/
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const outputPath = path.join(backupDir, `Quantum_Analytics_Corp_Nexora_Mapped_Backup.json`);
        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
        console.log(`\n✅ Success! JSON backup file created at:\n${outputPath}`);

        process.exit(0);
    } catch (e) {
        console.error("Error generating backup mapping JSON:", e);
        process.exit(1);
    }
}
run();
