const mongoose = require('mongoose');

async function check() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const Role = require('./models/Role');
        const Admin = require('./models/Admin');

        const admin = await Admin.findOne({ email: 'admin@nexora.in' });
        console.log(`Admin Company ID: ${admin._id}`);

        const roles = await Role.find({
            $or: [
                { companyId: admin._id },
                { scope: 'Global' }
            ]
        });

        console.log("Found Roles:");
        roles.forEach(r => {
            console.log(` - RoleName: ${r.roleName}, scope: ${r.scope}, permissions:`, r.permissions);
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
