const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

async function run() {
    try {
        const uri = process.env.MONGO_URI;
        console.log("Connecting to URI:", uri);
        await mongoose.connect(uri);
        console.log("Connected successfully!");
        const count = await Admin.countDocuments();
        console.log("Number of admins:", count);
        const allAdmins = await Admin.find().lean();
        console.log("Admins details:", allAdmins.map(a => ({ id: a._id, email: a.email, companyName: a.companyName })));
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}
run();
