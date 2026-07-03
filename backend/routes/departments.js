const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const verifyToken = require('../middleware/auth');
const checkPermission = require('../middleware/rbac');
const generateCodeFromName = name => {
  const acronym = (name || '').trim().split(/\s+/).map(word => word[0] || '').join('').toUpperCase().slice(0, 4);
  return acronym || 'DEPT';
};

// GET all departments (company-scoped)
router.get('/', verifyToken, async (req, res) => {
  try {
    const list = await Department.find({
      company: req.user.company
    }).populate('head', 'name empId role').sort({
      name: 1
    });
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET department analytics (Deep Aggregation)
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const analytics = await Employee.aggregate([{
      $match: {
        company: new mongoose.Types.ObjectId(req.user.company)
      }
    }, {
      $group: {
        _id: "$department",
        headcount: {
          $sum: 1
        },
        active: {
          $sum: {
            $cond: [{
              $eq: ["$status", "Active"]
            }, 1, 0]
          }
        },
        inactive: {
          $sum: {
            $cond: [{
              $ne: ["$status", "Active"]
            }, 1, 0]
          }
        },
        avgSalary: {
          $avg: "$salary"
        },
        males: {
          $sum: {
            $cond: [{
              $eq: ["$gender", "Male"]
            }, 1, 0]
          }
        },
        females: {
          $sum: {
            $cond: [{
              $eq: ["$gender", "Female"]
            }, 1, 0]
          }
        }
      }
    }, {
      $project: {
        _id: 0,
        departmentName: "$_id",
        headcount: 1,
        active: 1,
        inactive: 1,
        attritionRate: {
          $cond: [{
            $eq: ["$headcount", 0]
          }, 0, {
            $multiply: [{
              $divide: ["$inactive", "$headcount"]
            }, 100]
          }]
        },
        avgSalary: 1,
        diversity: {
          malePct: {
            $multiply: [{
              $divide: ["$males", {
                $max: ["$headcount", 1]
              }]
            }, 100]
          },
          femalePct: {
            $multiply: [{
              $divide: ["$females", {
                $max: ["$headcount", 1]
              }]
            }, 100]
          }
        }
      }
    }, {
      $sort: {
        headcount: -1
      }
    }]);
    res.status(200).json(analytics);
  } catch (err) {
    console.error('Analytics agg error:', err);
    res.status(500).json({
      message: err.message
    });
  }
});

// POST create/update department (company-scoped)
router.post('/', verifyToken, checkPermission('manage_departments'), async (req, res) => {
  try {
    const {
      id,
      name,
      code,
      description,
      head,
      capacity
    } = req.body;
    const normalizedName = name?.trim();
    if (!normalizedName) return res.status(400).json({
      message: 'Department name is required.'
    });
    const query = id ? {
      _id: id,
      company: req.user.company
    } : {
      company: req.user.company,
      name: normalizedName
    };

    // Capacity Validation Logic
    const requestedCapacity = Number(capacity) || 0;
    const admin = await Admin.findById(req.user.company);
    const companyLimit = admin ? admin.departmentQuotaTarget : 10;
    const availableCompanyLimit = Math.max(0, companyLimit);

    let targetDeptId = id;
    let existing = null;
    if (!targetDeptId) {
      existing = await Department.findOne(query);
      if (existing) targetDeptId = existing._id;
    } else {
      existing = await Department.findOne(query);
    }
    
    let finalCode = existing ? existing.code : '';
    if (!existing) {
      if (code) {
        finalCode = code.trim().toUpperCase();
      } else {
        let isUnique = false;
        let seqNum = (await Department.countDocuments({ company: req.user.company })) + 1;
        while (!isUnique) {
          finalCode = `DEPT${String(seqNum).padStart(2, '0')}`;
          const dup = await Department.findOne({ company: req.user.company, code: finalCode });
          if (dup) {
            seqNum++;
          } else {
            isUnique = true;
          }
        }
      }
    }

    const otherDepartments = await Department.find({
      company: req.user.company,
      ...(targetDeptId ? { _id: { $ne: targetDeptId } } : {})
    });

    const usedCapacity = otherDepartments.reduce((acc, dept) => acc + (dept.capacity || 0), 0);
    
    if (usedCapacity + requestedCapacity > availableCompanyLimit) {
      return res.status(400).json({
        message: `Subscription Limit Reached! Your company is currently limited to ${companyLimit} departments. Please upgrade your Subscription Plan to add more departments.`
      });
    }

    const update = {
      name: normalizedName,
      code: finalCode,
      description: description?.trim() || '',
      capacity: requestedCapacity,
      head: head || null,
      company: req.user.company
    };
    const savedDepartment = await Department.findOneAndUpdate(query, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }).populate('head', 'name empId role');
    res.status(201).json(savedDepartment);
  } catch (err) {
    console.error('Department save error:', err);
    res.status(500).json({
      message: err.message
    });
  }
});

// PUT assign head (company-scoped)
router.put('/:id/assign-head', verifyToken, checkPermission('manage_departments'), async (req, res) => {
  try {
    const {
      headEmployeeId
    } = req.body;
    const dept = await Department.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      head: headEmployeeId || null
    }, {
      new: true
    }).populate('head', 'name empId role positionLevel');
    if (!dept) return res.status(404).json({
      message: 'Department not found.'
    });
    res.status(200).json(dept);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE department (company-scoped)
router.delete('/', verifyToken, checkPermission('manage_departments'), async (req, res) => {
  try {
    const {
      id,
      name,
      code
    } = req.body;
    const baseQuery = {
      company: req.user.company
    };
    const query = id ? {
      ...baseQuery,
      _id: id
    } : name ? {
      ...baseQuery,
      name: name.trim()
    } : code ? {
      ...baseQuery,
      code: code.trim().toUpperCase()
    } : null;
    if (!query) return res.status(400).json({
      message: 'Provide department id, name, or code to delete.'
    });
    await Department.deleteOne(query);
    res.status(200).json({
      message: 'Department removed successfully'
    });
  } catch (err) {
    console.error('Department delete error:', err);
    res.status(500).json({
      message: err.message
    });
  }
});
module.exports = router;