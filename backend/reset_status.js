const mongoose = require('mongoose');
const Candidate = require('./models/Candidate');
require('dotenv').config();

async function reset() {
  await mongoose.connect(process.env.MONGO_URI);
  await Candidate.updateMany({ status: 'Rejected' }, { $set: { status: 'Applied' } });
  console.log("Reset complete");
  process.exit(0);
}
reset();
