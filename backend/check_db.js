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

        const admins = await Admin.find({});
        console.log(`Found ${admins.length} Admins:`);
        admins.forEach(a => {
            console.log(`- Admin ID: ${a._id}, Name: ${a.name || a.username}, Email: ${a.email}, Company: ${a.company}`);
        });

        const employees = await Employee.find({});
        console.log(`Found ${employees.length} Employees:`);
        employees.slice(0, 5).forEach(e => {
            console.log(`- Employee ID: ${e._id}, Name: ${e.name}, Email: ${e.email}, Company: ${e.company}, Dept: ${e.department}`);
        });

        const projects = await Project.find({});
        console.log(`Found ${projects.length} Projects total.`);
        projects.forEach(p => {
            console.log(`- Project ID: ${p._id}, Title: ${p.title}, Company: ${p.company}, Status: ${p.status}`);
        });

        const tasks = await Task.find({});
        console.log(`Found ${tasks.length} Tasks total.`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
