const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const Role = require('../models/Role');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/hrms";

const defaultRoles = [
    {
        roleName: 'Super Admin',
        scope: 'Global',
        subRoleCategory: 'Super Admin Owner',
        permissions: ['manage_users', 'manage_roles', 'view_payroll', 'approve_leaves', 'view_audit_logs', 'manage_company'],
        timeBasedAccess: { isRestricted: false, startTime: "00:00", endTime: "23:59" }
    },
    {
        roleName: 'Company Admin',
        scope: 'Global',
        subRoleCategory: 'None',
        permissions: ['manage_users', 'manage_roles', 'view_payroll', 'approve_leaves', 'view_audit_logs', 'manage_company'],
        timeBasedAccess: { isRestricted: false, startTime: "09:00", endTime: "18:00" }
    },
    {
        roleName: 'HR Manager',
        scope: 'Global',
        subRoleCategory: 'None',
        permissions: ['manage_users', 'view_payroll', 'approve_leaves', 'view_audit_logs'],
        timeBasedAccess: { isRestricted: false, startTime: "09:00", endTime: "18:00" }
    },
    {
        roleName: 'Staff',
        scope: 'Global',
        subRoleCategory: 'None',
        permissions: ['approve_leaves'],
        timeBasedAccess: { isRestricted: false, startTime: "09:00", endTime: "18:00" }
    },
    {
        roleName: 'Employee',
        scope: 'Global',
        subRoleCategory: 'None',
        permissions: [],
        timeBasedAccess: { isRestricted: false, startTime: "09:00", endTime: "18:00" }
    }
];

async function seedRoles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB.");

        for (const roleData of defaultRoles) {
            const existing = await Role.findOne({ roleName: roleData.roleName, scope: 'Global' });
            if (!existing) {
                await Role.create(roleData);
                console.log(`Created default role: ${roleData.roleName}`);
            } else {
                console.log(`Role ${roleData.roleName} already exists.`);
            }
        }
        
        console.log("Roles seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to seed roles:", err);
        process.exit(1);
    }
}

seedRoles();
