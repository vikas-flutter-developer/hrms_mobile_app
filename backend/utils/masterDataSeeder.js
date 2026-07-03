const Admin = require('../models/Admin');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const LeavePolicy = require('../models/LeavePolicy');
const KPI = require('../models/KPI');
const MasterData = require('../models/MasterData');
const CustomRole = require('../models/CustomRole');

async function seedGlobalMasterDataToCompany(companyId) {
    try {
        const globalTemplates = await MasterData.find({ companyId: null });
        if (!globalTemplates.length) return;

        for (const template of globalTemplates) {
            await seedTemplateToCompany(template, companyId);
        }
    } catch (err) {
        console.error("Error seeding global master data to new company:", err);
    }
}

async function seedTemplateToAllCompanies(template) {
    try {
        const companies = await Admin.find({});
        for (const c of companies) {
            await seedTemplateToCompany(template, c._id);
        }
    } catch (err) {
        console.error("Error seeding template to all companies:", err);
    }
}

async function seedTemplateToCompany(template, companyId) {
    try {
        if (template.category === 'Department') {
            const exists = await Department.findOne({ company: companyId, name: template.name });
            if (!exists) {
                const code = template.code || template.name.substring(0, 3).toUpperCase() || 'DPT';
                await Department.create({ 
                    company: companyId, 
                    name: template.name, 
                    code, 
                    description: template.description || '', 
                    capacity: template.capacity || 0 
                });
            }
        } else if (template.category === 'Designation') {
            // Seed CustomRole (Designations) to standardise gratuity and grades
            const roleExists = await CustomRole.findOne({ company: companyId, title: template.name });
            if (!roleExists) {
                await CustomRole.create({
                    company: companyId,
                    title: template.name,
                    level: template.level || 5,
                    salaryGrade: template.salaryGrade || '',
                    gratuityPercentage: template.gratuityPercentage || 0
                });
            }
        } else if (template.category === 'LeaveType') {
            const exists = await LeavePolicy.findOne({ company: companyId, type: template.name });
            if (!exists) {
                await LeavePolicy.create({ 
                    company: companyId, 
                    type: template.name, 
                    annualQuota: String(template.annualQuota || 0), 
                    description: template.description || '' 
                });
            }
        } else if (template.category === 'KPI') {
            const exists = await KPI.findOne({ company: companyId, title: template.name });
            if (!exists) {
                await KPI.create({ company: companyId, title: template.name, description: template.description || '' });
            }
        }
    } catch (e) {
        console.error(`Error seeding ${template.category} to company ${companyId}:`, e);
    }
}

module.exports = { seedGlobalMasterDataToCompany, seedTemplateToAllCompanies, seedTemplateToCompany };
