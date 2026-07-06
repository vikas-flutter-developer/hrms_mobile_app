const mongoose = require('mongoose');

async function seed() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const Employee = require('./models/Employee');
        const Expense = require('./models/Expense');

        const hr = await Employee.findOne({ email: 'hr@test.com' });
        if (!hr) {
            console.error("HR Employee not found!");
            process.exit(1);
        }
        console.log(`Found HR: ${hr.name} (ID: ${hr._id}, Company: ${hr.company})`);

        // Clean up previous expenses for the HR user to avoid duplicate seeding
        await Expense.deleteMany({ employeeId: hr._id });
        console.log("Deleted old expenses for HR.");

        const expensesData = [
            {
                company: hr.company,
                employeeId: hr._id,
                category: 'Travel',
                amount: 2500,
                dateIncurred: new Date('2026-07-04'),
                description: 'Client onsite travel reimbursement',
                status: 'Pending'
            },
            {
                company: hr.company,
                employeeId: hr._id,
                category: 'Food',
                amount: 1500,
                dateIncurred: new Date('2026-07-05'),
                description: 'Client project lunch meeting',
                status: 'Pending'
            },
            {
                company: hr.company,
                employeeId: hr._id,
                category: 'Office Supplies',
                amount: 3000,
                dateIncurred: new Date('2026-07-06'),
                description: 'Office whiteboard marker & supplies',
                status: 'Pending'
            }
        ];

        const seeded = await Expense.insertMany(expensesData);
        console.log(`Seeded ${seeded.length} expense claims successfully!`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
