const mongoose = require('mongoose');

async function list() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const Employee = require('./models/Employee');

        const employees = await Employee.find({}, 'name email role positionLevel department status');
        console.log("Registered Employees:");
        employees.forEach(emp => {
            console.log(` - Name: ${emp.name}, Email: ${emp.email}, Role: ${emp.role}, Position: ${emp.positionLevel}, Dept: ${emp.department}, Status: ${emp.status}`);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
list();
