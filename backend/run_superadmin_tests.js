const http = require('http');
const jwt = require('jsonwebtoken');

// Generate a mock Super Admin Token for testing
const token = jwt.sign(
    { id: 'mock_superadmin_id', role: 'superadmin', email: 'admin@hrms.com' },
    'HRMS_SUPER_SECRET_KEY@_123',
    { expiresIn: '1h' }
);

const ENDPOINTS = [
    { name: 'Dashboard Analytics', path: '/api/superadmin/dashboard-analytics' },
    { name: 'Billing Stats', path: '/api/superadmin/billing-stats' },
    { name: 'All Companies', path: '/api/superadmin/companies' },
    { name: 'Subscription Plans', path: '/api/superadmin/plans' },
    { name: 'Coupons', path: '/api/superadmin/coupons' },
    { name: 'Global Users', path: '/api/superadmin/users' },
    { name: 'Support Tickets', path: '/api/superadmin/tickets' },
    { name: 'App Settings', path: '/api/superadmin/settings' },
    { name: 'Announcements', path: '/api/superadmin/announcements' },
    { name: 'SSO Logs', path: '/api/superadmin/sso-logs' }
];

console.log('============================================');
console.log('🚀 RUNNING SUPER ADMIN API ENDPOINT AUDIT');
console.log('============================================\n');

async function testEndpoints() {
    let passed = 0;
    let failed = 0;

    for (const ep of ENDPOINTS) {
        try {
            const res = await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:5000${ep.path}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => resolve({ statusCode: response.statusCode, data }));
                });
                req.on('error', reject);
            });

            if (res.statusCode === 200) {
                console.log(`✅ [PASS] ${ep.name} (${ep.path})`);
                passed++;
            } else {
                console.log(`❌ [FAIL] ${ep.name} (${ep.path}) - Status: ${res.statusCode}`);
                failed++;
            }
        } catch (err) {
            console.log(`❌ [FAIL] ${ep.name} (${ep.path}) - Error: ${err.message}`);
            failed++;
        }
    }

    console.log('\n============================================');
    console.log(`🏁 AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('============================================');
    process.exit(failed > 0 ? 1 : 0);
}

testEndpoints();
