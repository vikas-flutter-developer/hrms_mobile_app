const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Event = require('./models/Event');

async function run() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect('mongodb+srv://yashmore9070_db_user:hrmsproject@cluster0.2piuu3o.mongodb.net/hrms');
        console.log("Connected!");

        // 1. Clear all existing events
        await Event.deleteMany({});
        console.log("Cleared all existing events.");

        const admins = await Admin.find({});
        const employees = await Employee.find({});

        // Get unique company IDs (which correspond to Admin IDs in multi-tenancy)
        const companyIds = new Set();
        admins.forEach(a => companyIds.add(a._id.toString()));
        employees.forEach(e => {
            if (e.company) companyIds.add(e.company.toString());
        });

        const sampleEvents = [
            {
                title: '🎉 Nexora Annual Founders Day Gala',
                description: 'Celebrating our enterprise milestones with live musical performances, colleague awards, and a multi-cuisine buffet.',
                date: '2026-07-20',
                location: 'Grand Ballroom, Hyatt Regency',
                status: 'Upcoming'
            },
            {
                title: '💡 GenAI Hackathon 2026: Smart Workflows',
                description: 'A 36-hour innovation sprint to build artificial intelligence tools to automate corporate workflows. Cash prizes up to $5,000!',
                date: '2026-08-05',
                location: 'Level 3 Innovation Lab',
                status: 'Upcoming'
            },
            {
                title: '⚽ Annual Inter-Department Sports Finals',
                description: 'The final matches for Cricket, Football, and Badminton championships. Food trucks and cold beverages will be provided.',
                date: '2026-08-12',
                location: 'City Sports Club Turf Arena',
                status: 'Upcoming'
            },
            {
                title: '🏢 Q3 Executive Townhall & Strategy Update',
                message: 'CEO and Leadership panel sharing updates on enterprise customer acquisitions, revenue projections, and Q3 roadmaps.',
                date: '2026-07-28',
                location: 'Main Auditorium / Zoom Webinar',
                status: 'Upcoming'
            },
            {
                title: '🌴 Weekend Outing & Adventure Retreat',
                description: 'Two days of team-building games, zip-lining, campfires, and resort stays to relax and recharge with colleagues.',
                date: '2026-09-05',
                location: 'Elysium Woods Forest Resort',
                status: 'Upcoming'
            },
            {
                title: '🏥 Corporate Health & Wellness Camp',
                description: 'Free comprehensive dental, heart, and stress diagnostics for all staff members, led by top wellness doctors.',
                date: '2026-08-20',
                location: 'Wellness Suite, Level 1',
                status: 'Upcoming'
            },
            {
                title: '🎨 Cultural Day & Traditional Wear Celebration',
                description: 'Celebrate our diverse workforce! Join us wearing regional attire, and sample food stalls representing different states.',
                date: '2026-08-28',
                location: 'Central Courtyard & Cafe',
                status: 'Upcoming'
            },
            {
                title: '🚀 Launch Party: HRMS Mobile App 3.0',
                description: 'Celebrating the successful production release of our next-gen HRMS mobile application with live DJ and drinks.',
                date: '2026-07-15',
                location: 'Skydeck Rooftop Lounge',
                status: 'Upcoming'
            },
            {
                title: '🌱 Clean & Green: Sapling Planting Drive',
                description: 'Voluntary environmental initiative to plant 500 saplings in the IT Park and transition to zero-plastic workspaces.',
                date: '2026-09-12',
                location: 'Silicon Valley Tech Park Lawns',
                status: 'Upcoming'
            },
            {
                title: '☕ Tech Seminar: Docker & Kubernetes Orchestration',
                description: 'Interactive knowledge-sharing workshop explaining containerization best practices, led by the Lead Architect.',
                date: '2026-07-25',
                location: 'Seminar Hall B, Level 2',
                status: 'Upcoming'
            }
        ];

        let totalEvents = 0;
        for (const compId of companyIds) {
            for (const item of sampleEvents) {
                const newEv = new Event({
                    company: compId,
                    title: item.title,
                    description: item.description || item.message,
                    date: new Date(item.date),
                    location: item.location,
                    status: item.status
                });
                await newEv.save();
                totalEvents++;
            }
        }

        console.log(`✅ Seeded ${totalEvents} professional events across all company tenants!`);
        process.exit(0);
    } catch (e) {
        console.error("Error seeding events:", e);
        process.exit(1);
    }
}
run();
