const Superadmin = require('../models/Superadmin');

const checkSuperAdminRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            const fs = require('fs');
            
            if (!req.user || req.user.role !== 'superadmin') {
                fs.appendFileSync('rbac_error.log', `[RBAC] Access Denied: req.user=${JSON.stringify(req.user)}. Superadmin only.\n`);
                return res.status(403).json({ message: "Access Denied: Superadmin only" });
            }

            const superadmin = await Superadmin.findById(req.user.id);
            if (!superadmin) {
                fs.appendFileSync('rbac_error.log', `[RBAC] Superadmin profile not found for ID: ${req.user.id}\n`);
                return res.status(404).json({ message: "Superadmin profile not found." });
            }

            const subRole = superadmin.subRole || 'Owner';

            // Owners bypass everything
            if (subRole === 'Owner') {
                return next();
            }

            if (!allowedRoles.includes(subRole)) {
                fs.appendFileSync('rbac_error.log', `[RBAC] Access Denied: Sub-role ${subRole} not in allowedRoles [${allowedRoles.join(',')}]\n`);
                return res.status(403).json({ 
                    message: `Access Denied: Your sub-role (${subRole}) does not have permission for this action.` 
                });
            }

            next();
        } catch (err) {
            res.status(500).json({ message: "Superadmin RBAC Verification Failed", error: err.message });
        }
    };
};

module.exports = checkSuperAdminRole;
