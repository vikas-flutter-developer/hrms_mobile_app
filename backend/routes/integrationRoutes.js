const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');

// Saare routes safely mapped hain
router.get('/config', integrationController.getIntegrationData);
router.post('/regenerate-key', integrationController.regenerateApiKey);
router.post('/update-webhook', integrationController.updateWebhookUrl);
router.post('/update-channels', integrationController.updateNotificationChannels);
router.put('/third-party', integrationController.updateThirdPartyIntegrations);
router.post('/test/:integration', integrationController.testThirdPartyConnection);

// Industry Grade OAuth & API Connectors
router.get('/zoom/auth', integrationController.zoomAuthRedirect);
router.get('/zoom/callback', integrationController.zoomCallback);
router.get('/google/auth', integrationController.googleAuthRedirect);
router.get('/google/callback', integrationController.googleCallback);

router.post('/quickbooks/connect', integrationController.connectQuickBooks);
router.post('/tally/connect', integrationController.connectTally);
router.post('/biometric/connect', integrationController.connectBiometric);

module.exports = router;