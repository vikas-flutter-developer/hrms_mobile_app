const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms')
.then(async () => {
    const admin = await Admin.findOne();
    if (!admin) return console.log("No admin found");

    let emp = await Employee.findOne({ email: 'emp@test.com' });
    if (!emp) {
        emp = new Employee({
            company: admin._id,
            empId: 'TEST001',
            name: 'Test Employee',
            firstName: 'Test',
            lastName: 'Employee',
            gender: 'Male',
            email: 'emp@test.com',
            password: await bcrypt.hash('password123', 10),
            department: 'Engineering',
            designation: 'Developer',
            dateOfJoining: new Date(),
            status: 'Active'
        });
        await emp.save();
        console.log("Created test employee: emp@test.com / password123");
    } else {
        console.log("Test employee already exists: emp@test.com / password123");
    }
    process.exit(0);
})
.catch(err => {
    console.error(err);
    process.exit(1);
});
