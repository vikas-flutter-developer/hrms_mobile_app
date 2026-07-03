const mongoose = require('mongoose');
const Holiday = require('./models/Holiday');
const Admin = require('./models/Admin');

async function checkHolidays() {
  await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
  const admin = await Admin.findOne({ email: 'admin@nexora.in' });
  console.log("Admin ID:", admin ? admin._id.toString() : 'None');
  
  const holidays = await Holiday.find({});
  console.log(`Total Holidays found: ${holidays.length}`);
  holidays.forEach(h => {
    console.log(`- ID: ${h._id}, Name: ${h.name}, Company: ${h.company}`);
  });
  process.exit(0);
}
checkHolidays();
