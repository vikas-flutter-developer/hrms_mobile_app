const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const setupSuperAdmin = async () => {
    try {
        // 1. Database se connect karo
        await mongoose.connect('mongodb://127.0.0.1:27017/hrms');
        console.log("💾 MongoDB Connected...");

        // 2. Password ko encrypt (hash) karo
        const hashedPassword = await bcrypt.hash('GodMode@123', 10);
        
        // 3. Direct 'superadmins' collection mein data daalo
        await mongoose.connection.db.collection('superadmins').insertOne({
            email: 'superadmin@hrms.com',
            password: hashedPassword,
            role: 'superadmin', // Login verify karne ke liye
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log("✅ Super Admin Account Successfully Created!");
        console.log("👉 Email: superadmin@hrms.com");
        console.log("👉 Password: GodMode@123");
        
        process.exit();
    } catch (err) {
        console.log("❌ Error:", err.message);
        process.exit(1);
    }
};

setupSuperAdmin();