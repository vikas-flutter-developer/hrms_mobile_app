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

        // 1. Restore the admin records to ensure they exist again
        for (const companyData of defaultCompanies) {
            let admin = await adminsColl.findOne({ companyName: companyData.companyName });
            if (!admin) {
                console.log(`Re-creating Admin record for: ${companyData.companyName}...`);
                admin = {
                    ...companyData,
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                await adminsColl.insertOne(admin);
                console.log(`Re-created ${companyData.companyName}!`);
            } else {
                console.log(`Admin record for ${companyData.companyName} already exists.`);
            }
        }

        // 2. Fetch Nexora Technologies data to duplicate/map
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

        const nexoraData = {};
        for (const colName of collections) {
            const coll = db.collection(colName);
            let query = {};
            if (colName === 'announcements') {
                query = { createdBy: new mongoose.Types.ObjectId(NEXORA_ID) };
            } else {
                query = { company: new mongoose.Types.ObjectId(NEXORA_ID) };
            }
            nexoraData[colName] = await coll.find(query).toArray();
            console.log(`- Fetched ${nexoraData[colName].length} documents from "${colName}"`);
        }

        // 3. Map backups for Quantum & Vortex
        const targets = [
            { name: "Quantum Analytics Corp", email: "turing@quantumanalyticscorp.com", file: "Quantum_Analytics_Corp_Backup.json" },
            { name: "Vortex Media Group", email: "stark@vortexmedia.org", file: "Vortex_Media_Group_Backup.json" }
        ];

        for (const target of targets) {
            const targetAdmin = await adminsColl.findOne({ email: target.email });
            const TARGET_ID = targetAdmin._id.toString();

            console.log(`\nGenerating clean backup for ${target.name} (ID: ${TARGET_ID})...`);

            // Generate fresh IDs for all documents to prevent duplicate key errors with Nexora
            const idMap = {};
            const generateNewId = (oldId) => {
                if (!oldId) return oldId;
                const oldStr = oldId.toString();
                if (!idMap[oldStr]) {
                    idMap[oldStr] = new mongoose.Types.ObjectId();
                }
                return idMap[oldStr];
            };

            // Pre-generate new IDs for employees, departments, projects, customroles, etc.
            const collectionsToMapIds = ['employees', 'departments', 'designations', 'customroles', 'projects', 'tasks', 'announcements', 'events', 'leaves', 'attendances', 'payslips', 'assets', 'expenses', 'holidays', 'leavepolicies'];
            for (const colName of collectionsToMapIds) {
                nexoraData[colName].forEach(doc => {
                    generateNewId(doc._id);
                });
            }

            const exportData = {
                companyId: TARGET_ID,
                exportedAt: new Date().toISOString(),
                company: targetAdmin
            };

            for (const colName of collections) {
                const mappedDocs = nexoraData[colName].map(doc => {
                    const cloned = { ...doc };
                    
                    // Assign fresh non-conflicting _id
                    cloned._id = generateNewId(cloned._id);

                    // Update company reference to target
                    if (cloned.company && cloned.company.toString() === NEXORA_ID) {
                        cloned.company = new mongoose.Types.ObjectId(TARGET_ID);
                    }
                    if (cloned.createdBy && cloned.createdBy.toString() === NEXORA_ID) {
                        cloned.createdBy = new mongoose.Types.ObjectId(TARGET_ID);
                    }

                    // Update relational foreign keys to use the newly mapped fresh IDs
                    if (cloned.employee && idMap[cloned.employee.toString()]) {
                        cloned.employee = idMap[cloned.employee.toString()];
                    }
                    if (cloned.department && idMap[cloned.department.toString()]) {
                        cloned.department = idMap[cloned.department.toString()];
                    }
                    if (cloned.designation && idMap[cloned.designation.toString()]) {
                        cloned.designation = idMap[cloned.designation.toString()];
                    }
                    if (cloned.role && idMap[cloned.role.toString()]) {
                        cloned.role = idMap[cloned.role.toString()];
                    }
                    if (cloned.project && idMap[cloned.project.toString()]) {
                        cloned.project = idMap[cloned.project.toString()];
                    }
                    if (cloned.task && idMap[cloned.task.toString()]) {
                        cloned.task = idMap[cloned.task.toString()];
                    }
                    if (cloned.leavePolicy && idMap[cloned.leavePolicy.toString()]) {
                        cloned.leavePolicy = idMap[cloned.leavePolicy.toString()];
                    }

                    return cloned;
                });

                const apiKey = colName === 'customroles' ? 'customRoles' : colName;
                exportData[apiKey] = mappedDocs;
            }

            // Save to Downloads folder directly
            const downloadsPath = path.join(process.env.USERPROFILE, 'Downloads', target.file);
            fs.writeFileSync(downloadsPath, JSON.stringify(exportData, null, 2), 'utf-8');
            console.log(`✅ Clean JSON Backup written directly to: ${downloadsPath}`);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error creating clean backups:", e);
        process.exit(1);
    }
}
run();
