const mongoose = require('mongoose');
require('dotenv').config();

const Admin = require('./models/Admin');
const Employee = require('./models/Employee');
const Ticket = require('./models/Ticket');
const SystemSetting = require('./models/SystemSetting');
const SuperAdminBroadcast = require('./models/SuperAdminBroadcast');

const superAdminRoutes = require('./routes/superAdmin');

// Find the route handler for GET /companies
const layer = superAdminRoutes.stack.find(l => l.route && l.route.path === '/companies');
const getCompanies = layer.route.stack[0].handle;

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const req = {};
        const res = {
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(data) {
                console.log("Status:", this.statusCode || 200);
                console.log("Length:", data.length);
                console.log("Data:", data);
            }
        };
        await getCompanies(req, res);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
