const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Asset = require('./models/Asset');
const AssetDamage = require('./models/AssetDamage');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        const admins = await Admin.find({});
        const employees = await Employee.find({});
        const assets = await Asset.find({}).limit(5);

        if (employees.length === 0 || assets.length === 0) {
            console.log("No employees or assets found!");
            process.exit(1);
        }

        const companyId = employees[0].company || (admins[0] ? admins[0]._id : null);

        const sampleDamages = [
            {
                description: 'Cracked screen after accidental fall from office desk',
                repairCost: 4500,
                paymentMode: 'Salary Deduction',
                status: 'Reported'
            },
            {
                description: 'Coffee spilled on keyboard causing key failure',
                repairCost: 2200,
                paymentMode: 'Lump Sum Payment',
                status: 'In Repair'
            },
            {
                description: 'Battery swollen and Trackpad unresponsive',
                repairCost: 6500,
                paymentMode: 'Company Covered',
                status: 'Resolved'
            }
        ];

        for (let i = 0; i < sampleDamages.length; i++) {
            const emp = employees[i % employees.length];
            const ast = assets[i % assets.length];
            const tpl = sampleDamages[i];

            const dmg = new AssetDamage({
                company: companyId,
                employeeId: emp._id,
                assetId: ast._id,
                description: tpl.description,
                repairCost: tpl.repairCost,
                paymentMode: tpl.paymentMode,
                status: tpl.status,
            });
            await dmg.save();
        }

        console.log("✅ Seeded sample Asset Damage tickets into MongoDB!");
        process.exit(0);
    } catch (e) {
        console.error("Error seeding damage samples:", e);
        process.exit(1);
    }
}
run();
