const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Attempt connection using the URI stored safely in your environment variables
      const conn = await mongoose.connect(process.env.MONGO_URI);
      
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    process.exit(1); // Force the application to shut down if database fails
  }
};

module.exports = connectDB;