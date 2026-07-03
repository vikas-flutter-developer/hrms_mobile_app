const mongoose = require('mongoose');

async function run() {
    try {
        await mongoose.connect('mongodb://localhost:27017/hrms');
        const db = mongoose.connection.db;
        
        const indexes = await db.collection('departments').indexes();
        console.log('Existing indexes:', indexes.map(i => i.name));
        
        if (indexes.find(i => i.name === 'name_1')) {
            console.log('Dropping name_1...');
            await db.collection('departments').dropIndex('name_1');
        }
        
        if (indexes.find(i => i.name === 'code_1')) {
            console.log('Dropping code_1...');
            await db.collection('departments').dropIndex('code_1');
        }
        
        console.log('Indexes dropped successfully.');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}
run();
