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
        const assets = await Asset.find({});

        console.log(`Found ${admins.length} Admins, ${employees.length} Employees, and ${assets.length} Assets.`);

        if (employees.length === 0 || assets.length === 0) {
            console.log("No employees or assets found!");
            process.exit(1);
        }

        const damageTemplates = [
            { description: 'Cracked 4K Retina screen panel due to accidental impact', cost: 8500, mode: 'Salary Deduction', status: 'Reported' },
            { description: 'Liquid / water damage to motherboard keyboard layout', cost: 5200, mode: 'Salary Deduction', status: 'Reported' },
            { description: 'Swollen Li-ion battery pack requiring safety replacement', cost: 3400, mode: 'Company Covered', status: 'In Repair' },
            { description: 'Broken hinge mechanism and top lid casing cracked', cost: 4100, mode: 'Lump Sum Payment', status: 'Reported' },
            { description: 'Faulty USB-C charging port pin deformation', cost: 1800, mode: 'Salary Deduction', status: 'In Repair' },
            { description: 'Physical drop damage causing SSD bad sectors', cost: 6800, mode: 'Lump Sum Payment', status: 'Resolved' },
            { description: 'Wireless headset headband snapped at side joint', cost: 2500, mode: 'Company Covered', status: 'Resolved' }
        ];

        let count = 0;

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const companyId = emp.company || (admins[0] ? admins[0]._id : null);
            if (!companyId) continue;

            const ast = assets[i % assets.length];
            const tpl = damageTemplates[i % damageTemplates.length];

            const dmg = new AssetDamage({
                company: companyId,
                employeeId: emp._id,
                assetId: ast._id,
                description: `${tpl.description} (${emp.name})`,
                repairCost: tpl.cost,
                paymentMode: tpl.mode,
                status: tpl.status,
                isDeductedFromSalary: tpl.mode === 'Salary Deduction'
            });
            await dmg.save();
            count++;
        }

        console.log(`✅ Seeded ${count} Asset Damage records into MongoDB!`);
        process.exit(0);
    } catch (e) {
        console.error("Error seeding asset damages:", e);
        process.exit(1);
    }
}
run();
