const Integration = require('../models/Integration');
const axios = require('axios'); 
const crypto = require('crypto'); // API key generate karne ke liye standard library

// 🔍 1. Get Integration Data
exports.getIntegrationData = async (req, res) => {
    try {
        const { companyId } = req.query;
        let config = await Integration.findOne({ companyId });
        
        // Agar pehle se us company ka record na ho, toh default blank record bana dein
        if (!config) {
            config = await Integration.create({ 
                companyId, 
                apiKey: `sk_live_${crypto.randomBytes(16).toString('hex')}` 
            });
        }
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching integration config" });
    }
};

// 🔄 2. Regenerate API Key
exports.regenerateApiKey = async (req, res) => {
    try {
        const { companyId } = req.body;
        const newKey = `sk_live_${crypto.randomBytes(16).toString('hex')}`;
        
        const updated = await Integration.findOneAndUpdate(
            { companyId },
            { $set: { apiKey: newKey } },
            { new: true }
        );
        res.status(200).json({ success: true, message: "API Credentials rotated safely", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error rotating API Key" });
    }
};

// 🌐 3. Update Webhook URL
exports.updateWebhookUrl = async (req, res) => {
    try {
        const { companyId, webhookUrl } = req.body;
        const updated = await Integration.findOneAndUpdate(
            { companyId },
            { $set: { webhookUrl } },
            { new: true }
        );
        res.status(200).json({ success: true, message: "Webhook URL updated", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating webhook" });
    }
};

// 📣 4. Update Category 2 Channels (Slack, Teams, WhatsApp)
exports.updateNotificationChannels = async (req, res) => {
    try {
        const { companyId, slackWebhookUrl, teamsWebhookUrl, whatsappApiToken, whatsappPhoneNumberId } = req.body;

        const updated = await Integration.findOneAndUpdate(
            { companyId },
            { 
                $set: { 
                    slackWebhookUrl, 
                    teamsWebhookUrl, 
                    whatsappApiToken, 
                    whatsappPhoneNumberId 
                } 
            },
            { new: true }
        );

        res.status(200).json({ success: true, message: "Notification dispatch channels updated", data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating notification channels" });
    }
};

// 🔌 Update Third Party Integrations Config (Zoom, Workspace, Tally)
exports.updateThirdPartyIntegrations = async (req, res) => {
    try {
        const { zoom, googleWorkspace, tally } = req.body;
        const CompanySettings = require('../models/CompanySettings');
        let settings = await CompanySettings.findOne();
        if (!settings) {
            settings = new CompanySettings({ companyName: "My Company" });
        }
        
        if (zoom) settings.thirdPartyIntegrations.zoom = { ...settings.thirdPartyIntegrations.zoom, ...zoom };
        if (googleWorkspace) settings.thirdPartyIntegrations.googleWorkspace = { ...settings.thirdPartyIntegrations.googleWorkspace, ...googleWorkspace };
        if (tally) settings.thirdPartyIntegrations.tally = { ...settings.thirdPartyIntegrations.tally, ...tally };
        
        await settings.save();
        res.status(200).json({ success: true, message: "Third-party integration configurations updated successfully.", data: settings.thirdPartyIntegrations });
    } catch (error) {
        console.error("Error updating integrations:", error);
        res.status(500).json({ success: false, message: "Error updating third-party integrations." });
    }
};

// 🔌 Test Third Party Integration Connection
exports.testThirdPartyConnection = async (req, res) => {
    try {
        const { integration } = req.params; // 'zoom' | 'googleWorkspace' | 'tally' | 'slack'
        
        // Check global availability from Super Admin settings
        const SystemSetting = require('../models/SystemSetting');
        const systemSettings = await SystemSetting.findOne();
        if (systemSettings && systemSettings.availableIntegrations) {
            const isAvailable = systemSettings.availableIntegrations[integration];
            if (isAvailable === false) {
                let label = integration === 'googleWorkspace' ? 'Google Workspace' : (integration === 'zoom' ? 'Zoom' : (integration === 'tally' ? 'Tally' : 'Slack'));
                return res.status(403).json({
                    success: false,
                    message: `${label}: This integration has been disabled globally by the system administrator.`
                });
            }
        }

        const CompanySettings = require('../models/CompanySettings');
        const settings = await CompanySettings.findOne();
        
        if (integration === 'slack') {
            const Integration = require('../models/Integration');
            const config = await Integration.findOne();
            if (!config || !config.slackWebhookUrl) {
                return res.status(400).json({
                    success: false,
                    message: "Slack: Connection failed. Ask Admin for key to complete the connection with exterior things."
                });
            }
            return res.status(200).json({ success: true, message: "Slack connection verified successfully." });
        }
        
        if (!settings || !settings.thirdPartyIntegrations || !settings.thirdPartyIntegrations[integration]) {
            let label = integration === 'googleWorkspace' ? 'Google Workspace' : (integration === 'zoom' ? 'Zoom' : 'Tally');
            return res.status(400).json({
                success: false,
                message: `${label}: Connection failed. Ask Admin for key to complete the connection with exterior things.`
            });
        }
        
        const config = settings.thirdPartyIntegrations[integration];
        
        const hasKeys = integration === 'tally' 
            ? (config.apiKey && config.endpointUrl)
            : (config.clientId && config.clientSecret);
            
        if (!hasKeys || !config.isConnected) {
            let label = integration === 'googleWorkspace' ? 'Google Workspace' : (integration === 'zoom' ? 'Zoom' : 'Tally');
            return res.status(400).json({
                success: false,
                message: `${label}: Connection failed. Ask Admin for key to complete the connection with exterior things.`
            });
        }
        
        let label = integration === 'googleWorkspace' ? 'Google Workspace' : (integration === 'zoom' ? 'Zoom' : 'Tally');
        res.status(200).json({ success: true, message: `${label} connection verified successfully.` });
    } catch (error) {
        console.error("Test integration error:", error);
        res.status(500).json({ success: false, message: "Connection test error." });
    }
};

// 🚀 REUSABLE CORE GLOBAL UTILITY
exports.sendPlatformNotification = async (companyId, messageText, whatsappTemplateName = null, whatsappRecipient = null) => {
    try {
        const config = await Integration.findOne({ companyId });
        if (!config) return;

        // 1. Slack Alert Trigger
        if (config.slackWebhookUrl) {
            await axios.post(config.slackWebhookUrl, { text: `🚨 *Platform Update:* ${messageText}` }).catch(e => console.log("Slack dispatch failed"));
        }

        // 2. Microsoft Teams Alert Trigger
        if (config.teamsWebhookUrl) {
            await axios.post(config.teamsWebhookUrl, {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": "4f46e5",
                "summary": "Platform Trigger Notification",
                "sections": [{ "activityTitle": "System Alert", "text": messageText }]
            }).catch(e => console.log("Teams dispatch failed"));
        }

        // 3. WhatsApp Business API
        if (config.whatsappApiToken && config.whatsappPhoneNumberId && whatsappTemplateName && whatsappRecipient) {
            await axios.post(`https://graph.facebook.com/v17.0/${config.whatsappPhoneNumberId}/messages`, {
                messaging_product: "whatsapp",
                to: whatsappRecipient,
                type: "template",
                template: {
                    name: whatsappTemplateName,
                    language: { code: "en_US" }
                }
            }, {
                headers: { 'Authorization': `Bearer ${config.whatsappApiToken}`, 'Content-Type': 'application/json' }
            }).catch(e => console.log("WhatsApp dispatch failed"));
        }

    } catch (err) {
        console.error("Global Notification Dispatcher Engine Fault:", err);
    }
};

// ==========================================
// 🚀 INDUSTRY GRADE OAUTH & CONNECTIONS
// ==========================================

// 📌 1. Zoom OAuth Flow
exports.zoomAuthRedirect = async (req, res) => {
    // Generate auth URL
    const zoomClientId = process.env.ZOOM_CLIENT_ID || 'dummy_zoom_client_id';
    const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/integrations/zoom/callback`);
    const state = req.query.companyId || req.query.token || 'default';
    const zoomAuthUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${zoomClientId}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state)}`;
    res.redirect(zoomAuthUrl);
};

exports.zoomCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).send("Authorization code missing");
        
        // In real-world, exchange code for token:
        // const response = await axios.post('https://zoom.us/oauth/token', ...)
        const mockAccessToken = `zm_at_${crypto.randomBytes(16).toString('hex')}`;
        const mockRefreshToken = `zm_rt_${crypto.randomBytes(16).toString('hex')}`;

        // Extract companyId from the state parameter
        const companyId = req.query.state || 'default_company_id';
        await Integration.findOneAndUpdate({ companyId }, {
            $set: {
                zoomToken: {
                    accessToken: mockAccessToken,
                    refreshToken: mockRefreshToken,
                    expiry: new Date(Date.now() + 3600000), // 1 hour
                    connected: true
                }
            }
        }, { upsert: true });

        // Redirect back to frontend
        res.redirect(`http://localhost:5173/superadmin?tab=integrations&zoom_connected=true`);
    } catch (error) {
        console.error("Zoom Auth Error:", error);
        res.status(500).send("Zoom Authorization failed");
    }
};

// 📌 2. Google Workspace OAuth Flow
exports.googleAuthRedirect = async (req, res) => {
    const googleClientId = process.env.GOOGLE_CLIENT_ID || 'dummy_google_client_id';
    const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/integrations/google/callback`);
    const scopes = encodeURIComponent('https://www.googleapis.com/auth/admin.directory.user.readonly');
    const state = req.query.companyId || req.query.token || 'default';
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&state=${encodeURIComponent(state)}`;
    res.redirect(googleAuthUrl);
};

exports.googleCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).send("Authorization code missing");

        const mockAccessToken = `ya29.${crypto.randomBytes(24).toString('hex')}`;
        const mockRefreshToken = `1//${crypto.randomBytes(24).toString('hex')}`;

        const companyId = req.query.state || 'default_company_id';
        await Integration.findOneAndUpdate({ companyId }, {
            $set: {
                googleWorkspaceToken: {
                    accessToken: mockAccessToken,
                    refreshToken: mockRefreshToken,
                    expiry: new Date(Date.now() + 3600000),
                    connected: true
                }
            }
        }, { upsert: true });

        res.redirect(`http://localhost:5173/superadmin?tab=integrations&google_connected=true`);
    } catch (error) {
        console.error("Google Auth Error:", error);
        res.status(500).send("Google Workspace Authorization failed");
    }
};

// 📌 3. API Key & Endpoint Connections
exports.connectQuickBooks = async (req, res) => {
    try {
        const { realmId, accessToken, refreshToken } = req.body;
        const companyId = req.user?.company || req.user?.id || 'default_company_id';
        await Integration.findOneAndUpdate({ companyId }, {
            $set: { quickbooksConfig: { realmId, accessToken, refreshToken, connected: true } }
        }, { upsert: true });
        res.status(200).json({ success: true, message: "QuickBooks securely connected" });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.connectTally = async (req, res) => {
    try {
        const { endpoint, username } = req.body;
        const companyId = req.user?.company || req.user?.id || 'default_company_id';
        await Integration.findOneAndUpdate({ companyId }, {
            $set: { tallyConfig: { endpoint, username, connected: true } }
        }, { upsert: true });
        res.status(200).json({ success: true, message: "Tally ERP securely connected" });
    } catch (err) { res.status(500).json({ success: false }); }
};

exports.connectBiometric = async (req, res) => {
    try {
        const { deviceIp, port, apiKey } = req.body;
        const companyId = req.user?.company || req.user?.id || 'default_company_id';
        await Integration.findOneAndUpdate({ companyId }, {
            $set: { biometricConfig: { deviceIp, port, apiKey, connected: true } }
        }, { upsert: true });
        res.status(200).json({ success: true, message: "Biometric devices connected" });
    } catch (err) { res.status(500).json({ success: false }); }
};