const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/auth');
const checkPermission = require('../middleware/rbac');
const createAuditLog = async (adminId, actionType, targetRole, details) => {
  try {
    await AuditLog.create({
      actionBy: adminId,
      actionType,
      targetRole,
      details
    });
  } catch (err) {
    console.error("Audit Log Error:", err);
  }
};

// ==========================================
// 1. 📝 CREATE NEW ROLE
// ==========================================
router.post('/roles', verifyToken, async (req, res) => {
  try {
    const {
      roleName,
      scope,
      companyId,
      permissions,
      subRoleCategory,
      timeBasedAccess
    } = req.body;
    const sanitizedCompanyId = (scope === 'Global' || !companyId || companyId === '') ? null : companyId;
    const newRole = new Role({
      roleName,
      scope,
      companyId: sanitizedCompanyId,
      permissions,
      subRoleCategory,
      timeBasedAccess
    });
    await newRole.save();
    const adminId = req.user?.id || req.user?._id;
    if (adminId) {
      await createAuditLog(adminId, 'ROLE_CREATED', newRole._id, `Created new role: ${roleName}`);
    }
    res.status(201).json({
      message: "Role created successfully",
      role: newRole
    });
  } catch (err) {
    console.error("Backend Role Creation Error:", err);
    res.status(500).json({
      message: "Failed to create role",
      error: err.message
    });
  }
});

// ==========================================
// 2. ✏️ EDIT / UPDATE ROLE PERMISSIONS
// ==========================================
// ✅ Yahan se Guard hata diya gaya hai!
router.put('/roles/:id', verifyToken, async (req, res) => {
  try {
    const roleId = req.params.id;
    const updates = req.body;
    const updatedRole = await Role.findByIdAndUpdate(roleId, updates, {
      new: true
    });
    if (!updatedRole) return res.status(404).json({
      message: "Role not found"
    });
    const adminId = req.user?.id || req.user?._id;
    if (adminId) {
      await createAuditLog(adminId, 'PERMISSION_CHANGED', updatedRole._id, `Updated permissions/settings for role: ${updatedRole.roleName}`);
    }
    res.status(200).json({
      message: "Role updated successfully",
      role: updatedRole
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update role",
      error: err.message
    });
  }
});

// ==========================================
// 3. 👯 CLONE ROLE 
// ==========================================
// ✅ Yahan se bhi Guard hata diya gaya hai!
router.post('/roles/:id/clone', verifyToken, async (req, res) => {
  try {
    const sourceRoleId = req.params.id;
    const {
      targetCompanyId,
      newRoleName
    } = req.body;
    const sourceRole = await Role.findById(sourceRoleId);
    if (!sourceRole) return res.status(404).json({
      message: "Source Role not found"
    });
    const clonedRole = new Role({
      roleName: newRoleName || `${sourceRole.roleName} (Cloned)`,
      scope: targetCompanyId ? 'Company' : 'Global',
      companyId: targetCompanyId || null,
      permissions: sourceRole.permissions,
      subRoleCategory: sourceRole.subRoleCategory,
      timeBasedAccess: sourceRole.timeBasedAccess
    });
    await clonedRole.save();
    const adminId = req.user?.id || req.user?._id;
    if (adminId) {
      await createAuditLog(adminId, 'ROLE_CLONED', clonedRole._id, `Cloned from role ID: ${sourceRoleId} to new role: ${clonedRole.roleName}`);
    }
    res.status(201).json({
      message: "Role cloned successfully",
      role: clonedRole
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to clone role",
      error: err.message
    });
  }
});

// ==========================================
// 4. 📜 FETCH AUDIT LOGS
// ==========================================
router.get('/audit-logs', verifyToken, async (req, res) => {
  try {
    const query = {};
    const logs = await AuditLog.find(query).populate('actionBy', 'name email').populate('targetRole', 'roleName').sort({
      createdAt: -1
    });
    res.status(200).json(logs);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch audit logs",
      error: err.message
    });
  }
});

// ==========================================
// 5. 👁️ FETCH ALL ROLES 
// ==========================================
router.get('/roles', verifyToken, async (req, res) => {
  try {
    let query = {};
    if (req.user?.role !== 'superadmin') {
      query = {
        $or: [
          { companyId: req.user.company },
          { scope: 'Global' }
        ]
      };
    }
    const roles = await Role.find(query).sort({
      createdAt: -1
    });
    res.status(200).json(roles);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch roles",
      error: err.message
    });
  }
});
// ==========================================
// 6. ❌ DELETE ROLE
// ==========================================
router.delete('/roles/:id', verifyToken, async (req, res) => {
  try {
    const roleId = req.params.id;
    const deletedRole = await Role.findByIdAndDelete(roleId);
    if (!deletedRole) {
      return res.status(404).json({ message: "Role not found" });
    }
    const adminId = req.user?.id || req.user?._id;
    if (adminId) {
      await createAuditLog(adminId, 'ROLE_DELETED', null, `Deleted role: ${deletedRole.roleName}`);
    }
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete role", error: err.message });
  }
});

module.exports = router;