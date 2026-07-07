const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        const db = mongoose.connection.db;
        const admins = await db.collection('admins').find({}).toArray();
        console.log("Admins List in DB:");
        admins.forEach(a => {
            console.log(`- ID: ${a._id}, Name: [${a.name}], CompanyName: [${a.companyName}], Email: [${a.email}]`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
