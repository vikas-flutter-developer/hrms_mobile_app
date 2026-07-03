// backend/routes/hrOversightRoutes.js
const express = require('express');
const router = express.Router();
const hrController = require('../controllers/hrOversightController');
const checkSuperAdminRole = require('../middleware/superAdminRbac');

const analyticsProtector = checkSuperAdminRole(['Owner', 'Analytics']);

router.get('/global-summary', analyticsProtector, hrController.getGlobalHROversight);
// Charts API setup
router.get('/monthly-trends', analyticsProtector, hrController.getMonthlyHRTrends);
module.exports = router;