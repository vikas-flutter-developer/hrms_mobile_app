const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const QUANTUM_ID = '6a4b5e6d00b07c1dfa2c3789';

async function run() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const backupPath = path.join(__dirname, 'backups', 'Quantum_Analytics_Corp_Backup.json');
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

        for (const [key, config] of Object.entries(models)) {
            if (parsedData[key] && Array.isArray(parsedData[key]) && parsedData[key].length > 0) {
                console.log(`\nTesting insertMany for ${key}...`);
                try {
                    // Try to validate first document
                    const firstDoc = parsedData[key][0];
                    const docInstance = new config.Model(firstDoc);
                    await docInstance.validate();
                    console.log(`✅ First document in ${key} passes validation.`);
                    
                    // Try insertMany
                    const result = await config.Model.insertMany(parsedData[key], { ordered: false });
                    console.log(`✅ Success! Inserted ${result.length} documents.`);
                } catch (err) {
                    console.error(`❌ Error in ${key}:`, err.message || err);
                    if (err.errors) {
                        console.log("Validation details:");
                        for (const [field, error] of Object.entries(err.errors)) {
                            console.log(`  - ${field}: ${error.message}`);
                        }
                    }
                }
            }
        }

        process.exit(0);
    } catch (e) {
        console.error("Critical error in test script:", e);
        process.exit(1);
    }
}
run();
