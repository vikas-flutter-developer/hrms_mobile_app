const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        const db = mongoose.connection.db;
        const logs = await db.collection('securitylogs').find({}).sort({ createdAt: -1 }).limit(10).toArray();
        console.log("Latest Security Logs:");
        logs.forEach(l => {
            console.log(`- Time: ${l.createdAt || l.timestamp}, Category: ${l.category}, Severity: ${l.severity}`);
            console.log(`  Details: ${l.details}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
