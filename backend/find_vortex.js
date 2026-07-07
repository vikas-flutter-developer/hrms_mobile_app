const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function run() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        const admins = await Admin.find({});
        console.log("All Admins in DB:");
        admins.forEach(a => {
            console.log(JSON.stringify({
                id: a._id.toString(),
                companyName: a.companyName,
                email: a.email,
                role: a.role
            }, null, 2));
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
