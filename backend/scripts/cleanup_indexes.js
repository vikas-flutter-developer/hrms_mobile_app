const mongoose = require('mongoose');

async function cleanupIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect('mongodb://127.0.0.1:27017/hrms');
    console.log("Connected.");

    const db = mongoose.connection.db;

    const collections = ['departments', 'designations', 'projects', 'employees', 'shifts'];

    for (const collName of collections) {
      try {
        console.log(`Checking indexes in ${collName}...`);
        const indexes = await db.collection(collName).indexes();
        for (const index of indexes) {
          // Drop if index is globally unique (e.g., just name_1 or title_1 without company)
          if (index.name === 'name_1' || index.name === 'title_1' || index.name === 'level_1' || index.name === 'email_1' && collName === 'employees') {
            console.log(`Dropping index ${index.name} from ${collName}...`);
            await db.collection(collName).dropIndex(index.name);
            console.log(`Dropped ${index.name} successfully.`);
          }
        }
      } catch (err) {
        console.error(`Error processing collection ${collName}:`, err.message);
      }
    }
    console.log("Cleanup complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanupIndexes();
