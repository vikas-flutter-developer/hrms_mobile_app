const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const db = mongoose.connection.db;

        // Fetch admins using raw MongoDB collection and regex names to bypass spaces or capitalization mismatches
        const adminsColl = db.collection('admins');
        const nexoraAdmin = await adminsColl.findOne({ companyName: /Nexora/i });
        const quantumAdmin = await adminsColl.findOne({ companyName: /Quantum/i });

        if (!nexoraAdmin) {
            console.error(`❌ Nexora admin not found!`);
            process.exit(1);
        }
        if (!quantumAdmin) {
            console.error(`❌ Quantum admin not found!`);
            process.exit(1);
        }

        const NEXORA_ID = nexoraAdmin._id;
        const QUANTUM_ID = quantumAdmin._id;

        console.log(`Nexora ID: ${NEXORA_ID}`);
        console.log(`Quantum ID: ${QUANTUM_ID}`);

        console.log("Fetching Nexora data from all collections...");
        
        // List of all collections to clone
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
            companyId: QUANTUM_ID.toString(),
            exportedAt: new Date().toISOString(),
            company: quantumAdmin
        };

        for (const colName of collections) {
            const coll = db.collection(colName);
            let query = {};
            if (colName === 'announcements') {
                query = { createdBy: NEXORA_ID };
            } else {
                query = { company: NEXORA_ID };
            }
            const docs = await coll.find(query).toArray();
            console.log(`- ${colName}: found ${docs.length} records`);

            // Map IDs from Nexora to Quantum
            const mappedDocs = docs.map(doc => {
                const cloned = { ...doc };
                if (cloned.company && cloned.company.toString() === NEXORA_ID.toString()) {
                    cloned.company = QUANTUM_ID;
                }
                if (cloned.createdBy && cloned.createdBy.toString() === NEXORA_ID.toString()) {
                    cloned.createdBy = QUANTUM_ID;
                }
                return cloned;
            });

            // Map customroles to match backend restore target
            const apiKey = colName === 'customroles' ? 'customRoles' : colName;
            exportData[apiKey] = mappedDocs;
        }

        const outputPath = path.join(__dirname, 'Quantum_Analytics_Corp_Mapped_Backup.json');
        fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf-8');
        console.log(`✅ Success! JSON backup file created at: ${outputPath}`);

        process.exit(0);
    } catch (e) {
        console.error("Error creating Quantum backup:", e);
        process.exit(1);
    }
}
run();
