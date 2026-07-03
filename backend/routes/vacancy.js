const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');
const Department = require('../models/Department');

// Path: GET http://localhost:5000/api/vacancies
router.get('/', verifyToken, async (req, res) => {
  try {
    let quotaTarget = 10;
    let sizeRange = '1-10';
    const requestorRole = req.user.role ? req.user.role.toLowerCase() : 'employee';

    // 1. Identify and recover the corresponding Admin context schema reference
    let adminId = req.user.id;
    if (requestorRole !== 'admin') {
      const empDoc = await Employee.findById(req.user.id);
      if (empDoc && empDoc.createdBy) {
        adminId = empDoc.createdBy;
      }
    }
    const adminDoc = await Admin.findById(adminId);
    if (adminDoc) {
      quotaTarget = adminDoc.employeeQuotaTarget || 10;
      sizeRange = adminDoc.companySizeRange || '1-10'; // Sourced directly from mongoose model
    }

    // 2. Define upper-bound dynamic caps depending on the registered size range
    const sizeCapsMapping = {
      '1-10': 10,
      '11-50': 50,
      '51-200': 200,
      '201-500': 500,
      '501+': 1000
    };
    const maxCapacityCeiling = sizeCapsMapping[sizeRange] || 10;

    // Dynamic Cap Boundary Guard: Prevents employee target definitions from exceeding structural limits
    const absoluteActiveQuota = Math.min(quotaTarget, maxCapacityCeiling);

    // 3. Fetch current employee headcounts and departments
    const employeesList = await Employee.find({
      company: req.user.company
    });

    const departmentsList = await Department.find({
      company: req.user.company
    });

    // 4. Compute vacancies dynamically using Department capacities
    const dynamicVacancies = departmentsList.map((dept, idx) => {
      const filledCount = employeesList.filter(emp => emp.department === dept.name).length;
      const target = dept.capacity || 0;
      const vacancy = target - filledCount;
      const colors = ['bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600'];
      const color = colors[idx % colors.length];
      const priority = vacancy > 2 ? 'High' : vacancy > 0 ? 'Medium' : 'Low';
      
      return {
        id: dept._id,
        department: dept.name,
        filled: filledCount,
        target: target,
        color: color,
        priority: priority
      };
    });

    // Track floating miscellaneous employees smoothly without breaking team constraints
    const deptNames = departmentsList.map(d => d.name);
    const otherEmployees = employeesList.filter(emp => !deptNames.includes(emp.department));
    if (otherEmployees.length > 0) {
      dynamicVacancies.push({
        id: 'v-others',
        department: 'General Support / Others',
        filled: otherEmployees.length,
        target: otherEmployees.length,
        color: 'bg-gray-400',
        priority: 'Low'
      });
    }

    res.status(200).json(dynamicVacancies);
  } catch (err) {
    console.error("Vacancy schema range calculation exception:", err);
    res.status(500).json({
      message: "Internal server error parsing dynamic vacancy quotas."
    });
  }
});
module.exports = router;