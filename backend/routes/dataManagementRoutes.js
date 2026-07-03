// backend/routes/dataManagementRoutes.js
const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataManagementController');
const multer = require('multer');
const checkSuperAdminRole = require('../middleware/superAdminRbac');

const ownerProtector = checkSuperAdminRole(['Owner']);
const analyticsProtector = checkSuperAdminRole(['Owner', 'Analytics']);

// Multer memory storage set karein taaki seedhe buffer parse ho sake
const upload = multer({
  storage: multer.memoryStorage()
});

// Routes setup
router.get('/export-companies', analyticsProtector, dataController.exportCompanyData);
router.get('/export-json', analyticsProtector, dataController.exportAllDataJson);
router.get('/storage-usage', analyticsProtector, dataController.getStorageMetrics);

// 👇 NEW BULK IMPORT ENDPOINT
router.post('/bulk-import', ownerProtector, upload.single('datasheet'), dataController.bulkImportCompanies);
// Retention and Purging routes setup
router.get('/retention-policy', analyticsProtector, dataController.getRetentionPolicy);
router.post('/retention-policy/update', ownerProtector, dataController.updateRetentionPolicy);
router.post('/purge-now', ownerProtector, dataController.triggerImmediatePurge);

// Health & Backups
router.get('/db-health', analyticsProtector, dataController.getDatabaseHealth);
router.get('/backups', analyticsProtector, dataController.getDatabaseBackups);
router.post('/backup', ownerProtector, dataController.createDatabaseBackup);
router.post('/restore', ownerProtector, dataController.restoreDatabaseBackup);

module.exports = router;