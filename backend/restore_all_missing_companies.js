const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const NEXORA_ID = '6a1fdfcc0a3c320a2def2aa9';

const defaultCompanies = [
    {
        _id: new mongoose.Types.ObjectId('6a4b5e6d00b07c1dfa2c3789'),
        adminId: "AD-003",
        name: "Alan Turing",
        email: "turing@quantumanalyticscorp.com",
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
        pinCode: "122003"
    },
    {
        _id: new mongoose.Types.ObjectId('6a4b5e6d00b07c1dfa2c378b'),
        adminId: "AD-005",
        name: "Tony Stark",
        email: "stark@vortexmedia.org",
        phone: "9988776655",
        companyName: "Vortex Media Group",
        companyType: "Enterprise",
        industryType: "Media & Advertising",
        companyStartDate: new Date("2022-11-01"),
        selectedPlanName: "Pro",
        planPrice: "7999",
        status: "Suspended",
        hasPaidTier: true,
        employeeQuotaTarget: 200,
        departmentQuotaTarget: 30,
        storageQuotaTarget: 100,
        address: "Stark Tower, Bandra Kurla Complex",
        city: "Mumbai",
        state: "Maharashtra",
        pinCode: "400051"
    },
    {
        _id: new mongoose.Types.ObjectId('6a4b5e6d00b07c1dfa2c378c'),
        adminId: "AD-006",
        name: "Warren Buffet",
        email: "buffet@alphafintech.com",
        phone: "9001122334",
        companyName: "Alpha FinTech Pvt. Ltd.",
        companyType: "MNC",
        industryType: "Banking & Financial Services",
        companyStartDate: new Date("2021-05-18"),
        selectedPlanName: "Plus",
        planPrice: "4999",
        status: "Active",
        hasPaidTier: true,
        employeeQuotaTarget: 75,
        departmentQuotaTarget: 15,
        storageQuotaTarget: 30,
        address: "Fintech Square, Gachibowli",
        city: "Hyderabad",
        state: "Telangana",
        pinCode: "500032"
    }
];

async function run() {
    try {
        console.log("Connecting to MongoDB secure pipeline...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const db = mongoose.connection.db;
        const adminsColl = db.collection('admins');
        const hashedPassword = await bcrypt.hash("Password123", 10);

        // Verify or create each company
        for (const companyData of defaultCompanies) {
            let admin = await adminsColl.findOne({ companyName: companyData.companyName });
            if (!admin) {
                console.log(`Creating Admin record for: ${companyData.companyName}...`);
                admin = {
                    ...companyData,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await adminsColl.insertOne(admin);
                console.log(`Created ${companyData.companyName}!`);
            } else {
                console.log(`Admin record for ${companyData.companyName} already exists.`);
            }
        }

        // Fetch Nexora data to duplicate/map
        console.log("\nFetching Nexora Technologies data...");
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

        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Map and save backups for each seeded company
        const targets = [
            { name: "Quantum Analytics Corp", email: "turing@quantumanalyticscorp.com" },
            { name: "Vortex Media Group", email: "stark@vortexmedia.org" }
        ];

        for (const target of targets) {
            const targetAdmin = await adminsColl.findOne({ email: target.email });
            const TARGET_ID = targetAdmin._id.toString();

            console.log(`\nMapping Nexora data to ${target.name} (ID: ${TARGET_ID})...`);

            const exportData = {
                companyId: TARGET_ID,
                exportedAt: new Date().toISOString(),
                company: targetAdmin
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

                // Map Nexora ID to Target ID
                const mappedDocs = docs.map(doc => {
                    const cloned = { ...doc };
                    if (cloned.company && cloned.company.toString() === NEXORA_ID) {
                        cloned.company = new mongoose.Types.ObjectId(TARGET_ID);
                    }
                    if (cloned.createdBy && cloned.createdBy.toString() === NEXORA_ID) {
                        cloned.createdBy = new mongoose.Types.ObjectId(TARGET_ID);
                    }
                    return cloned;
                });

                const apiKey = colName === 'customroles' ? 'customRoles' : colName;
                exportData[apiKey] = mappedDocs;
            }

            const safeName = target.name.replace(/[^a-zA-Z0-9]/g, '_');
            const outputPath = path.join(backupDir, `${safeName}_Backup.json`);
            fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
            console.log(`✅ JSON Backup created: ${outputPath}`);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error seeding & creating backups:", e);
        process.exit(1);
    }
}
run();
