const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Asset = require('./models/Asset');
const AssetRequest = require('./models/AssetRequest');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const admins = await Admin.find({});
        console.log("Admins:");
        admins.forEach(a => console.log(` Admin ID: ${a._id}, Email: ${a.email}, Company: ${a.companyName}`));

        const totalAssets = await Asset.countDocuments({});
        console.log(`Total Assets in DB: ${totalAssets}`);
        const assets = await Asset.find({}).limit(5).populate('assignedTo', 'name empId');
        assets.forEach(a => console.log(` Asset: ${a.name}, Company: ${a.company}, AssignedTo: ${a.assignedTo ? a.assignedTo.name : 'None'}`));

        const totalRequests = await AssetRequest.countDocuments({});
        console.log(`Total Asset Requests in DB: ${totalRequests}`);
        const requests = await AssetRequest.find({}).limit(5).populate('employeeId', 'name empId');
        requests.forEach(r => console.log(` Request: ${r.assetType}, Company: ${r.company}, Employee: ${r.employeeId ? r.employeeId.name : 'None'}`));

        process.exit(0);
    } catch (e) {
        console.error("Error inspecting:", e);
        process.exit(1);
    }
}
run();
