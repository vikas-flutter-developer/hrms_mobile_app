const mongoose = require('mongoose');

async function seed() {
    try {
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected successfully!");

        const Employee = require('./models/Employee');
        const Project = require('./models/Project');
        const Task = require('./models/Task');

        const vikas = await Employee.findOne({ email: 'emp@test.com' });
        const neha = await Employee.findOne({ email: 'hr@test.com' });

        if (!vikas || !neha) {
            console.error("Employee or HR not found!");
            process.exit(1);
        }

        console.log(`Found Vikas: ${vikas._id}, Neha: ${neha._id}`);

        // Clean up previous projects & tasks to avoid duplicates
        await Project.deleteMany({ company: vikas.company });
        await Task.deleteMany({ company: vikas.company });
        console.log("Cleaned up old projects and tasks.");

        // Create Projects
        const p1 = new Project({
            company: vikas.company,
            title: 'Core E-Commerce Platform',
            description: 'Building the next-gen scalable e-commerce engine with inventory management and secure gateways.',
            department: 'Engineering',
            projectManager: neha._id,
            teamLead: vikas._id,
            members: [vikas._id, neha._id],
            status: 'In Progress',
            startDate: new Date('2026-06-01'),
            deadline: new Date('2026-12-31')
        });

        const p2 = new Project({
            company: vikas.company,
            title: 'HRMS Mobile App Integration',
            description: 'Flutter-based employee self-service mobile app integrated with microservices backend.',
            department: 'Engineering',
            projectManager: neha._id,
            teamLead: vikas._id,
            members: [vikas._id, neha._id],
            status: 'In Progress',
            startDate: new Date('2026-07-01'),
            deadline: new Date('2026-10-30')
        });

        await p1.save();
        await p2.save();
        console.log("Projects created successfully!");

        // Create Tasks
        const tasksData = [
            {
                company: vikas.company,
                project: p1._id,
                title: 'Design Database Schema',
                description: 'Model SQL & NoSQL relations for catalog and user carts.',
                assignedTo: vikas._id,
                status: 'Todo',
                priority: 'High',
                deadline: new Date('2026-07-15'),
                createdBy: neha._id
            },
            {
                company: vikas.company,
                project: p1._id,
                title: 'Integrate Stripe Payment Gateway',
                description: 'Implement secure webhook handlers and card checkout sessions.',
                assignedTo: vikas._id,
                status: 'In Progress',
                priority: 'High',
                deadline: new Date('2026-07-20'),
                createdBy: neha._id
            },
            {
                company: vikas.company,
                project: p1._id,
                title: 'Optimize Core API Latency',
                description: 'Add Redis cache layer to product search endpoints.',
                assignedTo: neha._id,
                status: 'Todo',
                priority: 'Medium',
                deadline: new Date('2026-08-05'),
                createdBy: vikas._id
            },
            {
                company: vikas.company,
                project: p2._id,
                title: 'Setup Push Notifications',
                description: 'Configure Firebase Cloud Messaging and APNS tokens.',
                assignedTo: vikas._id,
                status: 'Review',
                priority: 'Medium',
                deadline: new Date('2026-07-25'),
                createdBy: neha._id
            },
            {
                company: vikas.company,
                project: p2._id,
                title: 'Build Login Screen UI & Provider',
                description: 'Design responsive login form with persistent JWT storage.',
                assignedTo: neha._id,
                status: 'Completed',
                priority: 'High',
                deadline: new Date('2026-07-04'),
                createdBy: vikas._id
            }
        ];

        const seededTasks = await Task.insertMany(tasksData);
        console.log(`Seeded ${seededTasks.length} tasks successfully!`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
