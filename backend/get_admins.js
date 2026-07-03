const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function run() {
    try {
        console.log("Connecting to Atlas...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");
        const admins = await Admin.find().lean();
        console.log("Admins:", admins.map(a => ({
            id: a._id,
            email: a.email,
            companyName: a.companyName,
            status: a.status
        })));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
