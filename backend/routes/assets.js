const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Asset = require('../models/Asset');
const AssetRequest = require('../models/AssetRequest');
const AssetDamage = require('../models/AssetDamage');

// GET all assets (company-scoped) or assigned to me
router.get('/', verifyToken, async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    let query = {
      company: req.user.company
    };
    if (req.query.assignedToMe === 'true') {
      const emp = await Employee.findById(req.user.id);
      if (!emp) return res.status(404).json({
        message: 'Employee not found'
      });
      query.assignedTo = emp._id;
    }
    const assets = await Asset.find({
      ...query,
      company: req.user.company
    }).populate('assignedTo', 'name empId department');
    res.status(200).json(assets);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET offboarding queue assets (assigned to offboarded employees)
router.get('/offboarding-queue', verifyToken, async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const offboardedEmps = await Employee.find({
      company: req.user.company,
      status: 'Offboarded'
    }).select('_id name department role exitDate');

    const empIds = offboardedEmps.map(e => e._id);

    // Find assets currently assigned to these employees, or recently returned
    const assets = await Asset.find({
      company: req.user.company,
      $or: [
        { assignedTo: { $in: empIds } },
        { status: 'Available', returnDate: { $exists: true } } // We can show recovered ones, filter or map
      ]
    }).populate('assignedTo', 'name department role exitDate');

    const queue = assets.filter(asset => {
      // If asset is assigned to one of offboarded, include it
      if (asset.assignedTo && empIds.some(id => id.toString() === asset.assignedTo._id.toString())) {
        return true;
      }
      return false;
    }).map(asset => {
      const emp = asset.assignedTo;
      return {
        id: asset.serialNumber || asset._id.toString().substring(0, 6),
        dbId: asset._id,
        empName: emp ? emp.name : 'Unknown',
        role: emp ? `${emp.department || ''} - ${emp.role || ''}` : 'Exiting Employee',
        itemsToCollect: 1,
        exitDate: emp && emp.exitDate ? new Date(emp.exitDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: asset.status === 'Available' ? 'Recovered' : 'Pending'
      };
    });

    res.status(200).json(queue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET analytics (company-scoped)
router.get('/analytics', verifyToken, async (req, res) => {
  try {
    const assets = await Asset.find({
      company: req.user.company
    });
    let totalValue = 0,
      depreciatedValue = 0,
      maintenanceDue = 0;
    const now = new Date();
    assets.forEach(asset => {
      if (asset.purchaseValue) {
        totalValue += asset.purchaseValue;
        const yearsOld = (now - new Date(asset.createdAt || now)) / (1000 * 60 * 60 * 24 * 365.25);
        const depreciation = asset.purchaseValue * ((asset.depreciationRate || 0) / 100) * yearsOld;
        depreciatedValue += Math.max(0, asset.purchaseValue - depreciation);
      }
      if (asset.nextMaintenanceDate && new Date(asset.nextMaintenanceDate) <= now) maintenanceDue++;
    });
    res.status(200).json({
      totalAssets: assets.length,
      assignedAssets: assets.filter(a => a.status === 'Assigned').length,
      availableAssets: assets.filter(a => a.status === 'Available').length,
      totalValue,
      depreciatedValue,
      maintenanceDue
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// CREATE asset
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      name,
      category,
      serialNumber,
      condition,
      status,
      purchaseValue,
      depreciationRate,
      nextMaintenanceDate,
      empName
    } = req.body;
    let assignedTo = null;
    if (empName) {
      const Employee = require('../models/Employee');
      const emp = await Employee.findOne({ name: new RegExp(empName, 'i'), company: req.user.company });
      if (emp) assignedTo = emp._id;
    }
    const newAsset = new Asset({
      company: req.user.company,
      name,
      category,
      serialNumber,
      condition,
      status,
      purchaseValue,
      depreciationRate,
      nextMaintenanceDate,
      assignedTo
    });
    const savedAsset = await newAsset.save();
    res.status(201).json(savedAsset);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});


// GET asset categories — reads super admin's global MasterData AssetCategory records + admin's custom additions
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const MasterData = require('../models/MasterData');
    const Admin = require('../models/Admin');

    // 1. Load super admin's global asset categories from MasterData
    const globalRecords = await MasterData.find({ category: 'AssetCategory', companyId: null, isActive: true });
    const globalCategories = globalRecords.length > 0
      ? globalRecords.map(r => r.name)
      : ['Laptop', 'Mobile', 'Monitor', 'Phone', 'Access Card', 'Vehicle', 'Furniture', 'Other'];

    // 2. Load admin's saved custom category list (additions/removals from global)
    const admin = await Admin.findById(req.user.company).select('assetCategories');
    const adminCategories = admin?.assetCategories || [];

    // 3. Merge: use admin's list as base (preserving their removals of globals),
    //    then append any NEW global categories added by super admin that aren't yet in admin's list.
    let finalCategories;
    if (adminCategories.length > 0) {
      const adminSet = new Set(adminCategories);
      const newGlobals = globalCategories.filter(g => !adminSet.has(g));
      finalCategories = [...adminCategories, ...newGlobals];
    } else {
      // Admin hasn't customized yet — show pure global defaults
      finalCategories = globalCategories;
    }

    res.status(200).json({ categories: finalCategories, globalCategories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT asset categories — admin saves their company's custom list
router.put('/categories', verifyToken, async (req, res) => {
  try {
    const Admin = require('../models/Admin');
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ message: 'categories must be an array' });
    await Admin.findByIdAndUpdate(req.user.company, { assetCategories: categories });
    res.status(200).json({ categories, message: 'Asset categories updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE asset
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updatedAsset = await Asset.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, req.body, {
      new: true
    }).populate('assignedTo', 'name empId department');
    res.status(200).json(updatedAsset);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// RETURN asset
router.post('/:id/return', verifyToken, async (req, res) => {
  try {
    const {
      condition
    } = req.body;
    const updatedAsset = await Asset.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      status: 'Available',
      assignedTo: null,
      returnDate: new Date(),
      condition: condition || 'Good'
    }, {
      new: true
    }).populate('assignedTo', 'name empId department');
    res.status(200).json(updatedAsset);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// DELETE asset
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    await Asset.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company
    });
    res.status(200).json({
      message: 'Asset deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET my asset requests
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const Employee = require('../models/Employee');
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({
      message: 'Employee not found'
    });
    const requests = await AssetRequest.find({
      company: req.user.company,
      employeeId: emp._id
    }).sort({
      createdAt: -1
    });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// POST asset request
router.post('/request', verifyToken, async (req, res) => {
  try {
    const {
      assetType,
      reason,
      urgency
    } = req.body;
    const Employee = require('../models/Employee');
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({
      message: 'Employee not found'
    });
    const newReq = new AssetRequest({
      company: req.user.company,
      employeeId: emp._id,
      assetType,
      reason,
      urgency
    });
    await newReq.save();
    res.status(201).json({
      message: 'Request submitted successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// POST report damage
router.post('/:id/report-damage', verifyToken, async (req, res) => {
  try {
    const {
      description
    } = req.body;
    const Employee = require('../models/Employee');
    const emp = await Employee.findById(req.user.id);
    if (!emp) return res.status(404).json({
      message: 'Employee not found'
    });
    const asset = await Asset.findOne({
      _id: req.params.id,
      company: req.user.company
    });
    if (!asset) return res.status(404).json({
      message: 'Asset not found'
    });
    const newDamage = new AssetDamage({
      company: req.user.company,
      employeeId: emp._id,
      assetId: asset._id,
      description
    });
    await newDamage.save();

    // Also update asset condition
    asset.condition = 'Fair';
    await asset.save();
    res.status(201).json({
      message: 'Damage reported successfully'
    });
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// --- ADMIN ROUTES ---

// GET all requests (admin)
router.get('/requests', verifyToken, async (req, res) => {
  try {
    const requests = await AssetRequest.find({
      company: req.user.company
    }).populate('employeeId', 'name empId department').sort({
      createdAt: -1
    });
    res.status(200).json(requests);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// UPDATE request status (admin)
router.put('/requests/:id/status', verifyToken, async (req, res) => {
  try {
    const {
      status,
      adminNotes
    } = req.body;
    const reqDoc = await AssetRequest.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      status,
      adminNotes,
      resolvedBy: req.user.id
    }, {
      new: true
    }).populate('employeeId', 'name empId department');
    res.status(200).json(reqDoc);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// GET all damages (admin)
router.get('/damages', verifyToken, async (req, res) => {
  try {
    const damages = await AssetDamage.find({
      company: req.user.company
    }).populate('employeeId', 'name empId department').populate('assetId', 'name serialNumber category').sort({
      createdAt: -1
    });
    res.status(200).json(damages);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// UPDATE damage status (admin)
router.put('/damages/:id/status', verifyToken, async (req, res) => {
  try {
    const {
      status,
      repairCost
    } = req.body;
    const dmgDoc = await AssetDamage.findOneAndUpdate({
      _id: req.params.id,
      company: req.user.company
    }, {
      status,
      repairCost,
      resolvedBy: req.user.id
    }, {
      new: true
    }).populate('employeeId', 'name empId department').populate('assetId', 'name serialNumber category');
    res.status(200).json(dmgDoc);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
});

// Ekdum last mein Export!
module.exports = router;