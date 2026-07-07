const mongoose = require('mongoose');
const Admin = require('./models/Admin');

async function run() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        const admin = await Admin.findOne({ companyName: /Vortex/i });
        if (admin) {
            console.log("Vortex Details:");
            console.log(JSON.stringify(admin, null, 2));
        } else {
            console.log("Vortex Media Group not found in DB.");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
