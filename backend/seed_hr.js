const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const bcrypt = require('bcryptjs');

async function run() {
    try {
        console.log("Connecting to Atlas...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // Find parent admin
        const adminEmail = 'admin@nexora.in';
        const admin = await Admin.findOne({ email: adminEmail });
        if (!admin) {
            console.error(`❌ Admin ${adminEmail} not found! Please seed admin first.`);
            process.exit(1);
        }

        const hrEmail = 'hr@test.com';
        const hrPasswordHash = await bcrypt.hash('password123', 10);

        let hr = await Employee.findOne({ email: hrEmail });
        if (!hr) {
            hr = new Employee({
                company: admin._id,
                empId: 'EMP-HR-001',
                name: 'Neha Sharma',
                gender: 'Female',
                email: hrEmail,
                password: hrPasswordHash,
                department: 'HR',
                role: 'hr',
                positionLevel: 'HR Manager',
                status: 'Active',
                phone: '+919999999998'
            });
            await hr.save();
            console.log("✅ Created test HR: hr@test.com / password123");
        } else {
            hr.password = hrPasswordHash;
            hr.role = 'hr';
            hr.company = admin._id;
            hr.status = 'Active';
            await hr.save();
            console.log("✅ Updated test HR: hr@test.com / password123");
        }

        process.exit(0);
    } catch (e) {
        console.error("Error running HR seeder:", e);
        process.exit(1);
    }
}
run();
