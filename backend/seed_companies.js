const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('./models/Admin');

async function seed() {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        console.error("❌ MONGO_URI not found in env variables!");
        process.exit(1);
    }
    
    await mongoose.connect(MONGO_URI);
    console.log("💾 Connected securely to MongoDB database.");

    // Keep existing Nexora Technologies to avoid breaking current sandbox accounts,
    // but delete any other companies to ensure a clean list of 5 high quality entries.
    const nexora = await Admin.findOne({ companyName: "Nexora Technologies Pvt. Ltd." });
    
    await Admin.deleteMany({ companyName: { $ne: "Nexora Technologies Pvt. Ltd." } });
    console.log("🧹 Cleaned old non-Nexora companies.");

    const hashedPassword = await bcrypt.hash("Password123", 10);

    const companiesToSeed = [
        {
            adminId: "AD-002",
            name: "Sarah Connor",
            email: "sarah@innovatelabs.co",
            password: hashedPassword,
            phone: "9812345678",
            companyName: "Innovate Labs LLC",
            companyType: "Startup",
            industryType: "Research & Development",
            companyStartDate: new Date("2024-03-15"),
            selectedPlanName: "Enterprise",
            planPrice: "9999",
            status: "Active",
            hasPaidTier: true,
            employeeQuotaTarget: 100,
            departmentQuotaTarget: 20,
            storageQuotaTarget: 50,
            address: "Tech Park Phase II, Outer Ring Road",
            city: "Bangalore",
            state: "Karnataka",
            pinCode: "560103"
        },
        {
            adminId: "AD-003",
            name: "Alan Turing",
            email: "turing@quantumanalyticscorp.com",
            password: hashedPassword,
            phone: "9765432109",
            companyName: "Quantum Analytics Corp",
            companyType: "MNC",
            industryType: "Data Science & AI",
            companyStartDate: new Date("2023-08-20"),
            selectedPlanName: "Plus",
            planPrice: "4999",
            status: "Active",
            hasPaidTier: true,
            employeeQuotaTarget: 50,
            departmentQuotaTarget: 10,
            storageQuotaTarget: 20,
            address: "Cyber City Towers, Sector 45",
            city: "Gurugram",
            state: "Haryana",
            pinCode: "122003"
        },
        {
            adminId: "AD-004",
            name: "Michael Scott",
            email: "m.scott@apexglobal.in",
            password: hashedPassword,
            phone: "9123456789",
            companyName: "Apex Global Solutions",
            companyType: "SME",
            industryType: "Logistics & Supply Chain",
            companyStartDate: new Date("2025-01-10"),
            selectedPlanName: "Free Trial",
            planPrice: "0",
            status: "Pending Approval",
            hasPaidTier: false,
            employeeQuotaTarget: 10,
            departmentQuotaTarget: 3,
            storageQuotaTarget: 5,
            address: "Commercial Hub, VIP Road",
            city: "Kolkata",
            state: "West Bengal",
            pinCode: "700052"
        },
        {
            adminId: "AD-005",
            name: "Tony Stark",
            email: "stark@vortexmedia.org",
            password: hashedPassword,
            phone: "9988776655",
            companyName: "Vortex Media Group",
            companyType: "Enterprise",
            industryType: "Media & Advertising",
            companyStartDate: new Date("2022-11-01"),
            selectedPlanName: "Pro",
            planPrice: "7999",
            status: "Suspended",
            hasPaidTier: true,
            employeeQuotaTarget: 200,
            departmentQuotaTarget: 30,
            storageQuotaTarget: 100,
            address: "Stark Tower, Bandra Kurla Complex",
            city: "Mumbai",
            state: "Maharashtra",
            pinCode: "400051"
        },
        {
            adminId: "AD-006",
            name: "Warren Buffet",
            email: "buffet@alphafintech.com",
            password: hashedPassword,
            phone: "9001122334",
            companyName: "Alpha FinTech Pvt. Ltd.",
            companyType: "MNC",
            industryType: "Banking & Financial Services",
            companyStartDate: new Date("2021-05-18"),
            selectedPlanName: "Plus",
            planPrice: "4999",
            status: "Active",
            hasPaidTier: true,
            employeeQuotaTarget: 75,
            departmentQuotaTarget: 15,
            storageQuotaTarget: 30,
            address: "Fintech Square, Gachibowli",
            city: "Hyderabad",
            state: "Telangana",
            pinCode: "500032"
        }
    ];

    await Admin.insertMany(companiesToSeed);
    console.log("🚀 5 New corporate workspaces successfully seeded into the database.");
    mongoose.disconnect();
}

seed().catch(err => {
    console.error("❌ Seeding execution error:", err);
    process.exit(1);
});
