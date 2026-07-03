// backend/routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController'); // Controller ko import kiya
const checkSuperAdminRole = require('../middleware/superAdminRbac');

// Apply rigid sub-role enforcement to all analytics paths
const analyticsProtector = checkSuperAdminRole(['Owner', 'Analytics']);

router.get('/', analyticsProtector, reportController.getPlatformReport);
router.post('/schedule', analyticsProtector, reportController.scheduleReport);
router.get('/scheduled-jobs', analyticsProtector, reportController.getScheduledReports);

module.exports = router;