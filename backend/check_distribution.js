const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');

async function run() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        const admins = await Admin.find({});
        const employees = await Employee.find({});

        console.log("Admins:");
        admins.forEach(a => {
            const count = employees.filter(e => e.company && e.company.toString() === a._id.toString()).length;
            console.log(`- Admin: ${a.name || a.username} (${a.email}), ID: ${a._id}, Employee Count: ${count}`);
        });

        console.log("\nEmployees with no company or different company:");
        employees.forEach(e => {
            if (!e.company) {
                console.log(`- Employee: ${e.name} (${e.email}), ID: ${e._id}, Company: None`);
            } else {
                const adminExists = admins.some(a => a._id.toString() === e.company.toString());
                if (!adminExists) {
                    console.log(`- Employee: ${e.name} (${e.email}), ID: ${e._id}, Company: ${e.company} (Admin NOT found!)`);
                }
            }
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
