const axios = require('axios');
async function test() {
    try {
        console.log("Requesting billing stats...");
        const res = await axios.get('http://localhost:5000/api/superadmin/billing-stats');
        console.log("Response status:", res.status);
        console.log("Response data:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error("Error fetching billing stats:", e.message);
        if (e.response) {
            console.error("Response error:", e.response.status, e.response.data);
        }
    }
}
test();
