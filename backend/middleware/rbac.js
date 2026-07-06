const Role = require('../models/Role');

const checkPermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // 🛑 NATIVE ADMINISTRATOR BYPASS
            // We gracefully allow 'admin', 'superadmin', and legacy 'hr' to bypass all permission checks.
            if (req.user.role && (req.user.role.toLowerCase() === 'admin' || req.user.role.toLowerCase() === 'superadmin' || req.user.role.toLowerCase() === 'hr')) {
                return next();
            }

            let userRole = null;
            if (req.user.roleId) {
                userRole = await Role.findById(req.user.roleId);
            }
            if (!userRole && req.user.role) {
                userRole = await Role.findOne({
                    roleName: { $regex: new RegExp(`^${req.user.role}$`, 'i') },
                    $or: [
                        { companyId: req.user.company || null },
                        { scope: 'Global' }
                    ]
                });
            }

            if (!userRole) {
                return res.status(403).json({ message: "Access Denied: No role configuration matching your account role name was found." });
            }

            // 1. Time-Based Access Check
            if (userRole.timeBasedAccess && userRole.timeBasedAccess.isRestricted) {
                const currentTime = new Date();
                const currentHour = currentTime.getHours(); 
                const currentMin = currentTime.getMinutes();
                
                const [startH, startM] = userRole.timeBasedAccess.startTime.split(':').map(Number);
                const [endH, endM] = userRole.timeBasedAccess.endTime.split(':').map(Number);

                const nowInMinutes = currentHour * 60 + currentMin;
                const startInMinutes = startH * 60 + startM;
                const endInMinutes = endH * 60 + endM;

                if (nowInMinutes < startInMinutes || nowInMinutes > endInMinutes) {
                    // ✅ English Translation Done
                    return res.status(403).json({ 
                        message: `Access Denied: Outside restricted working hours (${userRole.timeBasedAccess.startTime} to ${userRole.timeBasedAccess.endTime}).` 
                    });
                }
            }

            // 2. The Ultimate Super Admin Bypass
            if (userRole.subRoleCategory === 'Super Admin Owner') {
                return next();
            }

            // 3. Specific Permission Check
            if (!userRole.permissions.includes(requiredPermission)) {
                 // ✅ English Translation Done
                 return res.status(403).json({ 
                     message: `Access Denied: You lack the '${requiredPermission}' permission.` 
                 });
            }

            next();

        } catch (err) {
            res.status(500).json({ message: "RBAC Verification Failed", error: err.message });
        }
    };
};

module.exports = checkPermission;