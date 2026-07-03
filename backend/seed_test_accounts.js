const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const bcrypt = require('bcryptjs');

async function run() {
    try {
        console.log("Connecting to Atlas...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // 1. Reset Admin: admin@nexora.in password to Admin@123
        const adminEmail = 'admin@nexora.in';
        const newPasswordHash = await bcrypt.hash('Admin@123', 10);
        
        const admin = await Admin.findOneAndUpdate(
            { email: adminEmail },
            { $set: { password: newPasswordHash, status: 'Active' } },
            { new: true }
        );

        if (admin) {
            console.log(`✅ Admin password reset successful for: ${adminEmail}`);
            console.log(`   Password set to: Admin@123`);
            console.log(`   Company Name: ${admin.companyName}`);
        } else {
            console.log(`❌ Admin ${adminEmail} not found!`);
        }

        // 2. Make sure Employee: emp@test.com exists
        let emp = await Employee.findOne({ email: 'emp@test.com' });
        if (!emp && admin) {
            const empPasswordHash = await bcrypt.hash('password123', 10);
            emp = new Employee({
                company: admin._id,
                empId: 'EMP001',
                name: 'Vikas Dev',
                firstName: 'Vikas',
                lastName: 'Dev',
                gender: 'Male',
                email: 'emp@test.com',
                password: empPasswordHash,
                department: 'Engineering',
                designation: 'Developer',
                dateOfJoining: new Date(),
                status: 'Active',
                phone: '+919999999999'
            });
            await emp.save();
            console.log("✅ Created test employee: emp@test.com / password123");
        } else if (emp) {
            // Update password hash to make sure
            const empPasswordHash = await bcrypt.hash('password123', 10);
            emp.password = empPasswordHash;
            await emp.save();
            console.log("✅ Updated test employee: emp@test.com / password123");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error running seeder:", e);
        process.exit(1);
    }
}
run();
