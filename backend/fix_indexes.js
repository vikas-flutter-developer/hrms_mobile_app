require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to MongoDB. Dropping old global indexes...");
    
    // 1. Employees email index
    try {
        await mongoose.connection.collection('employees').dropIndex('email_1');
        console.log("Successfully dropped 'email_1' index from employees collection.");
    } catch (e) {
        if (e.codeName === 'IndexNotFound' || e.message.includes('index not found')) {
            console.log("Index 'email_1' does not exist or already dropped. No action needed.");
        } else {
            console.error("Error dropping email_1 index:", e.message);
        }
    }

    // 2. Shifts name index
    try {
        await mongoose.connection.collection('shifts').dropIndex('name_1');
        console.log("Successfully dropped 'name_1' index from shifts collection.");
    } catch (e) {
        if (e.codeName === 'IndexNotFound' || e.message.includes('index not found')) {
            console.log("Index 'name_1' does not exist or already dropped. No action needed.");
        } else {
            console.error("Error dropping name_1 index:", e.message);
        }
    }

    // 3. Assets serialNumber index
    try {
        await mongoose.connection.collection('assets').dropIndex('serialNumber_1');
        console.log("Successfully dropped 'serialNumber_1' index from assets collection.");
    } catch (e) {
        if (e.codeName === 'IndexNotFound' || e.message.includes('index not found')) {
            console.log("Index 'serialNumber_1' does not exist or already dropped. No action needed.");
        } else {
            console.error("Error dropping serialNumber_1 index:", e.message);
        }
    }

    // 4. CustomRoles title index
    try {
        await mongoose.connection.collection('customroles').dropIndex('title_1');
        console.log("Successfully dropped 'title_1' index from customroles collection.");
    } catch (e) {
        if (e.codeName === 'IndexNotFound' || e.message.includes('index not found')) {
            console.log("Index 'title_1' does not exist or already dropped. No action needed.");
        } else {
            console.error("Error dropping title_1 index:", e.message);
        }
    }
    
    console.log("Ensuring new indexes...");
    const Employee = require('./models/Employee');
    const Shift = require('./models/Shift');
    const Asset = require('./models/Asset');
    const CustomRole = require('./models/CustomRole');
    
    await Employee.syncIndexes();
    await Shift.syncIndexes();
    await Asset.syncIndexes();
    await CustomRole.syncIndexes();
    console.log("All indexes synced successfully.");
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
