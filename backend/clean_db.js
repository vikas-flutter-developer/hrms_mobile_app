const mongoose = require('mongoose');
const Designation = require('./models/Designation');
require('dotenv').config();

async function clean() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await Designation.deleteMany({
    title: { $in: [/employee/i, /hr/i, /ceo/i, /team.?lead/i] }
  });
  console.log(`Cleaned up ${result.deletedCount} designation entries from roles collection.`);
  process.exit(0);
}
clean();
