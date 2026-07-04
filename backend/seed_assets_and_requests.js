const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Asset = require('./models/Asset');
const AssetRequest = require('./models/AssetRequest');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const admins = await Admin.find({});
        const employees = await Employee.find({});

        console.log(`Found ${admins.length} Admins and ${employees.length} Employees.`);

        if (employees.length === 0) {
            console.log("No employees found. Seed test accounts first!");
            process.exit(1);
        }

        const assetsList = [
            { name: 'MacBook Pro 16 M3 Max', category: 'Laptops', serial: 'SN-APL-2026-001', value: 245000, condition: 'New', status: 'Assigned' },
            { name: 'Dell UltraSharp 27 4K Monitor', category: 'Monitors', serial: 'SN-DLL-9981-002', value: 45000, condition: 'Good', status: 'Assigned' },
            { name: 'iPhone 15 Pro Max 256GB', category: 'Mobiles', serial: 'SN-APL-IP15-003', value: 135000, condition: 'New', status: 'Assigned' },
            { name: 'Logitech MX Master 3S Mouse', category: 'Accessories', serial: 'SN-LOG-MX3S-004', value: 10500, condition: 'Good', status: 'Assigned' },
            { name: 'Jabra Evolve 75 Wireless Headset', category: 'Accessories', serial: 'SN-JAB-EV75-005', value: 22000, condition: 'Good', status: 'Assigned' },
            { name: 'ThinkPad T14 Gen 4 i7', category: 'Laptops', serial: 'SN-LEN-TP14-006', value: 115000, condition: 'New', status: 'Assigned' },
            { name: 'iPad Air 5th Gen M1', category: 'Mobiles', serial: 'SN-APL-PAD5-007', value: 62000, condition: 'Good', status: 'Assigned' },
            { name: 'Anker Thunderbolt 4 Docking Station', category: 'Accessories', serial: 'SN-ANK-TB4-008', value: 18500, condition: 'New', status: 'Assigned' }
        ];

        const requestsList = [
            { assetType: 'Monitor', reason: 'Need second 4K monitor for UI wireframe & frontend testing', urgency: 'Normal', status: 'Approved' },
            { assetType: 'Laptop', reason: 'Upgrading to Apple M3 MacBook for high performance iOS builds', urgency: 'Urgent', status: 'Pending' },
            { assetType: 'Headset', reason: 'Wireless headset microphone cuts out during client video calls', urgency: 'Normal', status: 'Pending' },
            { assetType: 'USB-C Dock', reason: 'Multi-display hub needed for connecting dual HDMI monitors', urgency: 'Normal', status: 'Approved' },
            { assetType: 'Office Chair', reason: 'Ergonomic lumbar support chair replacement for home setup', urgency: 'Normal', status: 'Pending' }
        ];

        let seededAssetsCount = 0;
        let seededRequestsCount = 0;

        for (let i = 0; i < employees.length; i++) {
            const emp = employees[i];
            const companyId = emp.company || (admins[0] ? admins[0]._id : null);
            if (!companyId) continue;

            // 1. Seed 2 assigned Assets for this employee
            for (let j = 0; j < 2; j++) {
                const assetTpl = assetsList[(i * 2 + j) % assetsList.length];
                const asset = new Asset({
                    company: companyId,
                    name: assetTpl.name,
                    category: assetTpl.category,
                    serialNumber: `${assetTpl.serial}-${i + 1}`,
                    condition: assetTpl.condition,
                    status: assetTpl.status,
                    purchaseValue: assetTpl.value,
                    assignedTo: emp._id
                });
                await asset.save();
                seededAssetsCount++;
            }

            // 2. Seed 1 Hardware Request for this employee
            const reqTpl = requestsList[i % requestsList.length];
            const reqDoc = new AssetRequest({
                company: companyId,
                employeeId: emp._id,
                assetType: reqTpl.assetType,
                reason: `${reqTpl.reason} (${emp.name})`,
                urgency: reqTpl.urgency,
                status: reqTpl.status
            });
            await reqDoc.save();
            seededRequestsCount++;
        }

        console.log(`✅ Seeded ${seededAssetsCount} Assets and ${seededRequestsCount} Hardware Requests into MongoDB!`);
        process.exit(0);
    } catch (err) {
        console.error("Error seeding assets:", err);
        process.exit(1);
    }
}

run();
